import { Buffer } from 'node:buffer'
import { createClient } from '@supabase/supabase-js'

const clean = (value, max = 2000) => String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max)
const emailPattern = /^[a-z0-9!#$%&'*+/=?^_{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
}
function getAdminClient() {
  const url = clean(process.env.SUPABASE_URL, 300).replace(/\/$/, '')
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') return null
    return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } })
  } catch { return null }
}
async function sendEmail({ lead, reason }) {
  const sender = clean(process.env.CONTACT_FROM_EMAIL, 240)
  const match = sender.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/)
  const fromEmail = match ? match[2].trim() : sender
  if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY || !emailPattern.test(fromEmail) || !emailPattern.test(String(lead.email || ''))) {
    return { sent: false, error: 'Mailjet, remitente o correo del cliente no configurado correctamente.' }
  }
  const credentials = Buffer.from(process.env.MAILJET_API_KEY + ':' + process.env.MAILJET_SECRET_KEY).toString('base64')
  const subject = 'Actualización sobre tu solicitud · Codexia Systems'
  const html = '<div style="font-family:Arial,sans-serif;line-height:1.7;color:#263447;max-width:640px;margin:auto"><div style="padding:24px 26px;background:#0d1930;color:#eef5ff;border-radius:14px 14px 0 0"><div style="font-size:12px;letter-spacing:2px;color:#7ee6f7;font-weight:700">CODEXIA SYSTEMS</div><h1 style="font-size:23px;margin:12px 0 0">Actualización de tu solicitud</h1></div><div style="padding:25px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 14px 14px"><p>Hola ' + escapeHtml(clean(lead.name, 160)) + ',</p><p>Gracias por contactar con Codexia Systems y compartir tu proyecto con nosotros. Después de revisar la información recibida, lamentamos informarte que no podremos aceptar esta solicitud en las condiciones actuales.</p><div style="padding:15px 17px;border-left:3px solid #d45b68;background:#fff5f5;border-radius:8px"><b>Motivo:</b><p style="white-space:pre-wrap;margin:8px 0 0">' + escapeHtml(reason) + '</p></div><p>Si deseas aclarar algún punto o explorar una alternativa, puedes responder a este correo.</p><p>Saludos,<br><b>Equipo de Codexia Systems</b><br>Transformamos Procesos en Soluciones.</p><hr style="border:0;border-top:1px solid #e5eaf0"><small style="color:#748196">Comunicación oficial de Codexia Systems</small></div></div>'
  try {
    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: { Authorization: 'Basic ' + credentials, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ Messages: [{
        From: { Email: fromEmail, Name: 'Contact · Codexia Systems' },
        To: [{ Email: lead.email, Name: lead.name }],
        ReplyTo: { Email: fromEmail, Name: 'Contact · Codexia Systems' },
        Subject: subject,
        TextPart: 'Hola ' + lead.name + ',\n\nGracias por contactar con Codexia Systems. Lamentamos informarte que no podremos aceptar esta solicitud en las condiciones actuales.\n\nMotivo: ' + reason + '\n\nSi deseas aclarar algún punto o explorar una alternativa, puedes responder a este correo.\n\nSaludos,\nEquipo de Codexia Systems',
        HTMLPart: html,
      }] }),
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) return { sent: false, error: 'Mailjet respondió HTTP ' + response.status + '.' }
    const result = await response.json()
    if (result?.Messages?.[0]?.Status !== 'success') return { sent: false, error: 'Mailjet no confirmó la aceptación del mensaje.' }
    return { sent: true }
  } catch { return { sent: false, error: 'No se pudo conectar con Mailjet.' } }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Vary', 'Authorization')
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Método no permitido.' }) }
  const token = String(req.headers?.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) return res.status(401).json({ error: 'Debes iniciar sesión.' })
  const admin = getAdminClient()
  if (!admin) return res.status(503).json({ error: 'El servicio CRM no está configurado.' })
  const { data: authData, error: authError } = await admin.auth.getUser(token)
  if (authError || !authData.user) return res.status(401).json({ error: 'La sesión no es válida o ha caducado.' })
  const role = authData.user.app_metadata?.role
  if (role !== 'owner' && role !== 'admin') return res.status(403).json({ error: 'Solo el propietario o un administrador puede rechazar solicitudes.' })
  let body
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}) } catch { return res.status(400).json({ error: 'Solicitud no válida.' }) }
  if (!body || typeof body !== 'object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body), 'utf8') > 5 * 1024) return res.status(400).json({ error: 'Solicitud no válida.' })
  const leadId = clean(body.leadId, 64)
  const reason = clean(body.reason, 1200)
  if (!uuidPattern.test(leadId) || reason.length < 8) return res.status(400).json({ error: 'Indica una solicitud válida y un motivo de al menos 8 caracteres.' })

  const { data: lead, error: leadError } = await admin.from('leads').select('id,name,email,service,status').eq('id', leadId).maybeSingle()
  if (leadError || !lead) return res.status(404).json({ error: 'No se encontró la solicitud.' })
  if (lead.status === 'rejected') return res.status(409).json({ error: 'Esta solicitud ya fue rechazada.' })
  if (!['new', 'reviewing', 'proposal'].includes(lead.status)) return res.status(409).json({ error: 'Solo se pueden rechazar solicitudes nuevas, en revisión o con propuesta.' })
  if (!emailPattern.test(String(lead.email || ''))) return res.status(422).json({ error: 'La solicitud no tiene un correo válido. No se rechazó para evitar dejar al cliente sin notificación.' })

  const { data: updated, error: updateError } = await admin.from('leads').update({
    status: 'rejected', rejection_reason: reason, rejection_email_sent_at: null,
  }).eq('id', lead.id).in('status', ['new', 'reviewing', 'proposal']).select('id').maybeSingle()
  if (updateError) return res.status(500).json({ error: 'No se pudo guardar el rechazo: ' + updateError.message })
  if (!updated) return res.status(409).json({ error: 'La solicitud cambió de estado. Actualiza el CRM e inténtalo de nuevo.' })

  const email = await sendEmail({ lead, reason })
  if (email.sent) {
    const { error: stampError } = await admin.from('leads').update({ rejection_email_sent_at: new Date().toISOString() }).eq('id', lead.id)
    if (stampError) console.error('[crm-lead-decision] Email sent but timestamp could not be saved:', stampError.code || 'unknown')
  }
  const { error: logError } = await admin.from('activity_log').insert({
    actor_id: authData.user.id, entity_type: 'lead', entity_id: lead.id,
    action: email.sent ? 'lead_rejected_and_notified' : 'lead_rejected_notification_failed',
    summary: 'Solicitud de ' + lead.name + ' (' + lead.email + ') rechazada. Motivo: ' + reason + (email.sent ? '. Mailjet aceptó el aviso.' : '. Aviso pendiente: ' + email.error),
  })
  if (logError) console.error('[crm-lead-decision] Could not write activity log:', logError.code || 'unknown')
  return res.status(200).json({ ok: true, rejected: true, emailSent: email.sent, message: email.sent ? 'Solicitud rechazada y correo aceptado por Mailjet.' : 'Solicitud rechazada; el correo no pudo enviarse.', emailError: email.sent ? null : email.error })
}
