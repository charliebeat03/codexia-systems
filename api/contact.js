import { createHmac } from 'node:crypto'
import { Buffer } from 'node:buffer'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const allowedServices = new Set([
  'Desarrollo de software',
  'Inteligencia artificial',
  'Aplicación o plataforma',
  'Automatización de procesos',
  'Consultoría / análisis',
  'No estoy seguro todavía',
  'Desarrollo de software a medida',
  'Aplicación web o móvil',
  'Diseño de producto digital',
  'Mantenimiento o mejora de un sistema',
  'Otro / Necesito orientación',
])

function clean(value, max) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max)
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char])
}

function getSupabaseConfig() {
  const url = clean(process.env.SUPABASE_URL, 300).replace(/\/$/, '')
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') return null
    return { url, key }
  } catch {
    return null
  }
}

async function consumeRateLimit(ip) {
  const config = getSupabaseConfig()
  if (!config) throw new Error('CRM_NOT_CONFIGURED')
  const ipHash = createHmac('sha256', config.key).update(ip || 'unknown').digest('hex')
  const response = await fetch(`${config.url}/rest/v1/rpc/consume_contact_rate_limit`, {
    method: 'POST',
    headers: {
      apikey: config.key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_ip_hash: ipHash, p_now: new Date().toISOString(), p_cooldown_seconds: 60 }),
  })
  if (!response.ok) throw new Error(`RATE_LIMIT_CHECK_FAILED_${response.status}`)
  return response.json()
}

async function saveLead(lead) {
  const config = getSupabaseConfig()
  if (!config) throw new Error('CRM_NOT_CONFIGURED')

  const response = await fetch(`${config.url}/rest/v1/leads`, {
    method: 'POST',
    headers: {
      apikey: config.key,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(lead),
  })

  if (!response.ok) {
    // Keep provider details server-side. Never send database diagnostics to a visitor.
    throw new Error(`CRM_WRITE_FAILED_${response.status}`)
  }
}

async function sendNotification({ name, email, organization, service, budget, timing, details, features }) {
  if (!process.env.RESEND_API_KEY || !process.env.CONTACT_TO_EMAIL || !process.env.CONTACT_FROM_EMAIL) {
    return 'not_configured'
  }

  const fields = [
    ['Nombre', name],
    ['Correo', email],
    ['Organización o proyecto', organization || 'No indicado'],
    ['Servicio', service],
    ['Presupuesto', budget || 'Por definir'],
    ['Plazo', timing || 'No indicado'],
    ['Descripción', details],
    ['Funciones o necesidades', features || 'No indicadas'],
  ]
  const html = `<h2>Nueva solicitud desde Codexia Systems</h2>${fields.map(([label, value]) => `<p><b>${escapeHtml(label)}:</b><br>${escapeHtml(value).replace(/\n/g, '<br>')}</p>`).join('')}`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL,
        to: [process.env.CONTACT_TO_EMAIL],
        reply_to: email,
        subject: `Nueva solicitud web: ${name} · ${service}`,
        html,
      }),
    })
    return response.ok ? 'sent' : 'failed'
  } catch {
    return 'failed'
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método no permitido.' })
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
  } catch {
    return res.status(400).json({ error: 'Solicitud no válida.' })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Solicitud no válida.' })
  }

  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > 12 * 1024) {
    return res.status(413).json({ error: 'La solicitud supera el tamaño permitido.' })
  }

  // Honeypot: respond successfully without storing or notifying.
  if (clean(body.website, 200)) return res.status(200).json({ ok: true })

  const ip = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim()

  const name = clean(body.name, 100)
  const email = clean(body.email, 160).toLowerCase()
  const service = clean(body.service, 100)
  const budget = clean(body.budget, 80) || 'Por definir'
  const details = clean(body.details ?? body.description, 2500)
  const organization = clean(body.organization, 140)
  const timing = clean(body.timing, 100)
  const features = clean(body.features, 1800)

  if (name.length < 2 || !emailPattern.test(email) || !allowedServices.has(service) || details.length < 20 || body.consent !== true) {
    return res.status(400).json({ error: 'Revisa los campos obligatorios e inténtalo de nuevo.' })
  }

  try {
    const allowed = await consumeRateLimit(ip)
    if (!allowed) return res.status(429).json({ error: 'Espera un minuto antes de enviar otra consulta.' })
    await saveLead({
      name,
      email,
      organization: organization || null,
      service,
      budget,
      timing: timing || null,
      details,
      features: features || null,
      source: 'website',
    })
  } catch (error) {
    const notConfigured = error instanceof Error && error.message === 'CRM_NOT_CONFIGURED'
    const rateLimitFailed = error instanceof Error && error.message.startsWith('RATE_LIMIT_CHECK_FAILED_')
    return res.status(notConfigured ? 503 : 502).json({
      error: notConfigured
        ? 'La recepción de consultas todavía no está conectada. Puedes copiar el resumen y enviarlo por otro medio.'
        : rateLimitFailed
          ? 'No pudimos verificar la protección antispam en este momento. Inténtalo más tarde.'
          : 'No pudimos guardar tu consulta en este momento. Inténtalo más tarde o copia el resumen como respaldo.',
    })
  }

  const notification = await sendNotification({ name, email, organization, service, budget, timing, details, features })

  const message = notification === 'sent'
    ? 'Tu solicitud quedó registrada y se envió una notificación al equipo de Codexia Systems.'
    : 'Tu solicitud quedó registrada correctamente. La notificación por correo todavía no está disponible, pero conservamos tu consulta para revisarla.'

  return res.status(201).json({ ok: true, message, notification })
}
