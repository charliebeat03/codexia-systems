import { Buffer } from 'node:buffer'
import { createClient } from '@supabase/supabase-js'

const clean = (value, max = 8000) => String(value ?? '').replace(/[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f]/g, '').trim().slice(0, max)
const emailPattern = /^[a-z0-9!#$%&'*+/=?^`_{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^`_{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$/i

function getAdminClient() {
  const url = clean(process.env.SUPABASE_URL, 300).replace(/\\/$/, '')
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') return null
    return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } })
  } catch { return null }
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Vary', 'Authorization')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método no permitido.' })
  }
  const token = String(req.headers?.authorization || '').match(/^Bearer\\s+(.+)$/i)?.[1]
  if (!token) return res.status(401).json({ error: 'Debes iniciar sesión.' })
  const admin = getAdminClient()
  if (!admin) return res.status(503).json({ error: 'El servicio de correo no está configurado.' })
  const { data: authData, error: authError } = await admin.auth.getUser(token)
  if (authError || !authData.user) return res.status(401).json({ error: 'La sesión no es válida o ha caducado.' })
  const role = authData.user.app_metadata?.role
  if (role !== 'owner' && role !== 'admin') return res.status(403).json({ error: 'Solo el propietario o un administrador puede responder consultas.' })

  let body
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}) }
  catch { return res.status(400).json({ error: 'Solicitud no válida.' }) }
  if (!body || typeof body !== 'object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body), 'utf8') > 10 * 1024) {
    return res.status(400).json({ error: 'Solicitud no válida.' })
  }
  const leadId = clean(body.leadId, 64)
  const subject = clean(body.subject, 180)
  const message = clean(body.message, 8000)
  if (!/^[0-9a-f-]{36}$/i.test(leadId) || subject.length < 2 || message.length < 2) {
    return res.status(400).json({ error: 'Indica una consulta y un mensaje válidos.' })
  }
  const { data: lead, error: leadError } = await admin.from('leads').select('id,name,email,service,contact_id').eq('id', leadId).maybeSingle()
  if (leadError || !lead) return res.status(404).json({ error: 'No se encontró la consulta.' })
  if (!emailPattern.test(String(lead.email || ''))) return res.status(422).json({ error: 'La consulta no tiene una dirección de correo válida.' })

  const sender = clean(process.env.CONTACT_FROM_EMAIL, 240)
  const senderMatch = sender.match(/^\\s*(.*?)\\s*<([^<>]+)>\\s*$/)
  const fromEmail = senderMatch ? senderMatch[2].trim() : sender
  const fromName = senderMatch ? senderMatch[1].replace(/^["']|["']$/g, '').trim() : 'Contact · Codexia Systems'
  if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY || !emailPattern.test(fromEmail)) {
    return res.status(503).json({ error: 'Mailjet o el remitente oficial todavía no están configurados.' })
  }

  const credentials = Buffer.from(process.env.MAILJET_API_KEY + ':' + process.env.MAILJET_SECRET_KEY).toString('base64')
  const html = '<div style="font-family:Arial,sans-serif;line-height:1.65;color:#17221f;max-width:640px;margin:auto"><p>Hola ' + escapeHtml(clean(lead.name, 100)) + ',</p><div style="white-space:pre-wrap">' + escapeHtml(message) + '</div><p style="margin-top:28px">Saludos,<br><b>Equipo de Codexia Systems</b><br>Transformamos Procesos en Soluciones.</p><hr style="border:0;border-top:1px solid #e1e8e4"><small>Codexia Systems · Comunicación oficial</small></div>'
  let mailResult
  try {
    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: { Authorization: 'Basic ' + credentials, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ Messages: [{
        From: { Email: fromEmail, Name: fromName || 'Contact · Codexia Systems' },
        To: [{ Email: lead.email, Name: lead.name }],
        ReplyTo: { Email: fromEmail, Name: 'Codex · Codexia Systems' },
        Subject: subject,
        TextPart: message + '\\n\\nSaludos,\\nEquipo de Codexia Systems',
        HTMLPart: html,
      }] }),
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) {
      console.error('[crm-reply] Mailjet HTTP status:', response.status)
      return res.status(502).json({ error: 'Mailjet no pudo aceptar el correo. Revisa el estado del remitente y vuelve a intentarlo.' })
    }
    mailResult = await response.json()
    if (mailResult?.Messages?.[0]?.Status !== 'success') return res.status(502).json({ error: 'Mailjet no confirmó la aceptación del correo.' })
  } catch {
    return res.status(502).json({ error: 'No se pudo conectar con Mailjet. Inténtalo de nuevo.' })
  }

  const { error: logError } = await admin.from('activity_log').insert({
    actor_id: authData.user.id,
    entity_type: 'lead',
    entity_id: lead.id,
    action: 'email_sent',
    summary: 'Respuesta enviada a ' + lead.email + ': ' + subject,
  })
  if (logError) console.error('[crm-reply] Could not write activity log:', logError.code || 'unknown')
  return res.status(200).json({ ok: true, message: 'Correo aceptado por Mailjet.', logged: !logError })
}
