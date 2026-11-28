import { createHmac } from 'node:crypto'
import { Buffer } from 'node:buffer'

const emailPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i
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
  if (!response.ok) throw new Error(`CRM_WRITE_FAILED_${response.status}`)
}

async function sendEmail({ to, from, subject, html, text, replyTo }) {
  try {
    const match = String(from).match(/^\s*(.*?)\s*<([^<>]+)>\s*$/)
    const fromEmail = match ? match[2].trim() : String(from).trim()
    const fromName = match ? match[1].replace(/^["']|["']$/g, '').trim() : 'Codexia Systems'
    const message = {
      From: { Email: fromEmail, Name: fromName || 'Codexia Systems' },
      To: [{ Email: to }],
      Subject: subject,
      HTMLPart: html,
      TextPart: text,
      ...(replyTo ? { ReplyTo: { Email: replyTo } } : {}),
    }
    const credentials = Buffer.from(`${process.env.MAILJET_API_KEY}:${process.env.MAILJET_SECRET_KEY}`).toString('base64')
    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({ Messages: [message] }),
    })
    if (!response.ok) {
      console.error(`[contact-email] Mailjet request failed with HTTP ${response.status}.`)
      return 'failed'
    }
    const result = await response.json()
    const status = result?.Messages?.[0]?.Status
    if (status !== 'success') {
      console.error(`[contact-email] Mailjet did not accept the message (status: ${String(status || 'unknown')}).`)
      return 'failed'
    }
    return 'sent'
  } catch (error) {
    console.error('[contact-email] Mailjet request error:', error instanceof Error ? error.name : 'UnknownError')
    return 'failed'
  }
}

async function sendNotification({ name, email, organization, service, budget, timing, details, features }) {
  const teamRecipients = {
    gmail: clean(process.env.CONTACT_TO_EMAIL, 160).toLowerCase(),
    businessGmail: clean(process.env.CONTACT_BUSINESS_EMAIL, 160).toLowerCase(),
    emayler: clean(process.env.CONTACT_CC_EMAIL, 160).toLowerCase(),
  }
  const recipientsAreValid = Object.values(teamRecipients).every(value => emailPattern.test(value))
  if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY || !process.env.CONTACT_FROM_EMAIL || !recipientsAreValid) {
    return { team: 'not_configured', recipients: { gmail: 'not_configured', businessGmail: 'not_configured', emayler: 'not_configured' }, customer: 'not_configured' }
  }
  const fields = [
    ['Nombre', name], ['Correo', email], ['Organización o proyecto', organization || 'No indicado'],
    ['Servicio', service], ['Presupuesto', budget || 'Por definir'], ['Plazo', timing || 'No indicado'],
    ['Descripción', details], ['Funciones o necesidades', features || 'No indicadas'],
  ]
  const fieldHtml = fields.map(([label, value]) => `<p><b>${escapeHtml(label)}:</b><br>${escapeHtml(value).replace(/\n/g, '<br>')}</p>`).join('')
  const teamHtml = `<h2>Nueva solicitud desde Codexia Systems</h2>${fieldHtml}`
  const customerHtml = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#17221f;max-width:640px;margin:auto"><h2 style="color:#087b68">Hemos recibido tu solicitud</h2><p>Hola ${escapeHtml(name)},</p><p>Gracias por contactar con <b>Codexia Systems</b>. Tu solicitud quedó registrada correctamente y nuestro equipo revisará la información.</p><p><b>Plazo estimado de respuesta:</b> normalmente entre 1 y 3 días hábiles. Si necesitamos aclarar algún detalle, te escribiremos a esta misma dirección.</p><p>Esta confirmación solo acredita la recepción de tu consulta; todavía no constituye una cotización definitiva ni la aceptación de un proyecto.</p><p>Conserva este correo como referencia. Puedes responder directamente a este mensaje si deseas añadir información.</p><p>Saludos,<br><b>Equipo de Codexia Systems</b><br>Transformamos Procesos en Soluciones.</p></div>`
  const [gmail, businessGmail, emayler, customer] = await Promise.all([
    sendEmail({ to: teamRecipients.gmail, from: process.env.CONTACT_FROM_EMAIL, replyTo: email, subject: `Nueva solicitud web: ${name} · ${service}`, html: teamHtml, text: fields.map(([label, value]) => `${label}: ${value}`).join('\\n\\n') }),
    sendEmail({ to: teamRecipients.businessGmail, from: process.env.CONTACT_FROM_EMAIL, replyTo: email, subject: `Nueva solicitud web: ${name} · ${service}`, html: teamHtml, text: fields.map(([label, value]) => `${label}: ${value}`).join('\\n\\n') }),
    sendEmail({ to: teamRecipients.emayler, from: process.env.CONTACT_FROM_EMAIL, replyTo: email, subject: `Nueva solicitud web: ${name} · ${service}`, html: teamHtml, text: fields.map(([label, value]) => `${label}: ${value}`).join('\\n\\n') }),
    sendEmail({ to: email, from: process.env.CONTACT_FROM_EMAIL, subject: 'Hemos recibido tu solicitud · Codexia Systems', html: customerHtml, text: `Hola ${name},\\n\\nGracias por contactar con Codexia Systems. Tu solicitud quedó registrada correctamente y nuestro equipo revisará la información.\\n\\nPlazo estimado de respuesta: normalmente entre 1 y 3 días hábiles. Si necesitamos aclarar algún detalle, te escribiremos a esta misma dirección.\\n\\nEsta confirmación acredita la recepción de tu consulta; todavía no constituye una cotización definitiva ni la aceptación de un proyecto.\\n\\nSaludos,\\nEquipo de Codexia Systems\\nTransformamos Procesos en Soluciones.` }),
  ])
  const recipients = { gmail, businessGmail, emayler }
  const sentCount = Object.values(recipients).filter(status => status === 'sent').length
  const team = sentCount === 3 ? 'sent' : sentCount > 0 ? 'partial' : 'failed'
  return { team, recipients, customer }
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

  if (!emailPattern.test(email)) {
    return res.status(400).json({ error: 'Introduce un correo electrónico válido (por ejemplo, nombre@dominio.com) para poder enviarte la confirmación.' })
  }
  if (name.length < 2 || !allowedServices.has(service) || details.length < 20 || body.consent !== true) {
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
  const message = notification.team === 'sent' && notification.customer === 'sent'
    ? 'Tu solicitud quedó registrada. Enviamos el aviso a los tres buzones del equipo y una confirmación a tu correo. Normalmente responderemos en 1 a 3 días hábiles.'
    : notification.team === 'partial'
      ? 'Tu solicitud quedó registrada, pero solo pudimos enviar el aviso a parte de los tres buzones del equipo. Revisaremos el envío pendiente.'
      : notification.team !== 'sent'
        ? 'Tu solicitud quedó registrada, pero no pudimos completar los avisos por correo al equipo. Revisaremos la incidencia.'
        : 'Tu solicitud quedó registrada y los tres buzones del equipo recibieron el aviso. La confirmación a tu correo no está disponible en este momento.'
  return res.status(201).json({ ok: true, message, notification })
}
