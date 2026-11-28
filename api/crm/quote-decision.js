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
async function sendRejectionEmail({ quote, contact, reason }) {
  const sender = clean(process.env.CONTACT_FROM_EMAIL, 240)
  const senderMatch = sender.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/)
  const fromEmail = senderMatch ? senderMatch[2].trim() : sender
  if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY || !emailPattern.test(fromEmail) || !emailPattern.test(String(contact.email || ''))) {
    return { sent: false, reason: 'Mailjet, remitente o correo del cliente no configurado correctamente.' }
  }
  const quoteNumber = String(quote.quote_number)
  const subject = 'Actualización de tu propuesta #' + quoteNumber + ' · Codexia Systems'
  const html = '<div style="font-family:Arial,sans-serif;line-height:1.7;color:#263447;max-width:640px;margin:auto"><div style="padding:24px 26px;background:#0d1930;color:#eef5ff;border-radius:14px 14px 0 0"><div style="font-size:12px;letter-spacing:2px;color:#7ee6f7;font-weight:700">CODEXIA SYSTEMS</div><h1 style="font-size:23px;margin:12px 0 0">Actualización de tu propuesta</h1></div><div style="padding:25px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 14px 14px"><p>Hola ' + escapeHtml(clean(contact.display_name, 160)) + ',</p><p>Gracias por considerar a Codexia Systems. Después de revisar la propuesta <b>#' + escapeHtml(quoteNumber) + '</b>, lamentamos informarte que no podremos aceptarla en las condiciones actuales.</p><div style="padding:15px 17px;border-left:3px solid #d45b68;background:#fff5f5;border-radius:8px"><b>Motivo comunicado:</b><p style="white-space:pre-wrap;margin:8px 0 0">' + escapeHtml(reason) + '</p></div><p>Si deseas aclarar algún punto o explorar una alternativa, puedes responder a este correo. Estaremos encantados de revisar otras posibilidades.</p><p>Saludos,<br><b>Equipo de Codexia Systems</b><br>Transformamos Procesos en Soluciones.</p><hr style="border:0;border-top:1px solid #e5eaf0"><small style="color:#748196">Comunicación oficial de Codexia Systems</small></div></div>'
  const credentials = Buffer.from(process.env.MAILJET_API_KEY + ':' + process.env.MAILJET_SECRET_KEY).toString('base64')
  try {
    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: { Authorization: 'Basic ' + credentials, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ Messages: [{
        From: { Email: fromEmail, Name: 'Contact · Codexia Systems' },
        To: [{ Email: contact.email, Name: contact.display_name }],
        ReplyTo: { Email: fromEmail, Name: 'Contact · Codexia Systems' },
        Subject: subject,
        TextPart: 'Hola ' + contact.display_name + ',\n\nGracias por considerar a Codexia Systems. Lamentamos informarte que no podremos aceptar la propuesta #' + quoteNumber + ' en las condiciones actuales.\n\nMotivo: ' + reason + '\n\nSi deseas aclarar algún punto o explorar una alternativa, puedes responder a este correo.\n\nSaludos,\nEquipo de Codexia Systems',
        HTMLPart: html,
      }] }),
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) return { sent: false, reason: 'Mailjet respondió HTTP ' + response.status + '.' }
    const result = await response.json()
    if (result?.Messages?.[0]?.Status !== 'success') return { sent: false, reason: 'Mailjet no confirmó la aceptación del mensaje.' }
    return { sent: true }
  } catch { return { sent: false, reason: 'No se pudo conectar con Mailjet.' } }
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
  if (role !== 'owner' && role !== 'admin') return res.status(403).json({ error: 'Solo el propietario o un administrador puede rechazar propuestas.' })
  let body
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}) } catch { return res.status(400).json({ error: 'Solicitud no válida.' }) }
  if (!body || typeof body !== 'object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body), 'utf8') > 5 * 1024) return res.status(400).json({ error: 'Solicitud no válida.' })
  const action = clean(body.action, 20)
  const quoteId = clean(body.quoteId, 64)
  const reason = clean(body.reason, 1200)
  if (!uuidPattern.test(quoteId) || !['reject', 'notify'].includes(action)) return res.status(400).json({ error: 'Indica una propuesta válida.' })
  if (action === 'reject' && reason.length < 8) return res.status(400).json({ error: 'El motivo debe contener al menos 8 caracteres.' })

  const { data: quote, error: quoteError } = await admin.from('crm_quotes').select('id,quote_number,contact_id,status,rejection_reason').eq('id', quoteId).maybeSingle()
  if (quoteError || !quote) return res.status(404).json({ error: 'No se encontró la propuesta.' })
  if (action === 'reject' && !['draft', 'sent'].includes(quote.status)) return res.status(409).json({ error: 'Solo se pueden rechazar propuestas en borrador o enviadas. Las propuestas aceptadas o cerradas no se modifican.' })
  if (action === 'notify' && quote.status !== 'rejected') return res.status(409).json({ error: 'Esta propuesta no figura como rechazada.' })
  const finalReason = action === 'reject' ? reason : clean(quote.rejection_reason, 1200)
  if (finalReason.length < 8) return res.status(409).json({ error: 'La propuesta no tiene un motivo de rechazo registrado.' })
  const { data: contact, error: contactError } = await admin.from('crm_contacts').select('display_name,email').eq('id', quote.contact_id).maybeSingle()
  if (contactError || !contact) return res.status(404).json({ error: 'No se encontró el contacto asociado.' })
  if (!emailPattern.test(String(contact.email || ''))) return res.status(422).json({ error: 'El contacto no tiene un correo válido. Actualiza su ficha antes de notificarlo.' })

  if (action === 'reject') {
    const { data: updated, error: updateError } = await admin.from('crm_quotes').update({ status: 'rejected', rejection_reason: finalReason, rejection_email_sent_at: null }).eq('id', quote.id).in('status', ['draft', 'sent']).select('id').maybeSingle()
    if (updateError) return res.status(500).json({ error: 'No se pudo guardar el rechazo: ' + updateError.message })
    if (!updated) return res.status(409).json({ error: 'La propuesta cambió de estado. Actualiza el CRM e inténtalo de nuevo.' })
  }

  const emailResult = await sendRejectionEmail({ quote, contact, reason: finalReason })
  if (emailResult.sent) {
    const { error: sentUpdateError } = await admin.from('crm_quotes').update({ rejection_email_sent_at: new Date().toISOString() }).eq('id', quote.id)
    if (sentUpdateError) console.error('[crm-quote-decision] Email sent but delivery timestamp could not be saved:', sentUpdateError.code || 'unknown')
    await admin.from('activity_log').insert({ actor_id: authData.user.id, entity_type: 'quote', entity_id: quote.id, action: action === 'reject' ? 'quote_rejected_and_notified' : 'quote_rejection_resent', summary: 'Presupuesto #' + quote.quote_number + ' rechazado. Aviso enviado a ' + contact.email + '. Motivo: ' + finalReason })
    return res.status(200).json({ ok: true, rejected: true, emailSent: true, message: 'Propuesta rechazada y correo aceptado por Mailjet.' })
  }
  await admin.from('activity_log').insert({ actor_id: authData.user.id, entity_type: 'quote', entity_id: quote.id, action: 'quote_rejected_notification_failed', summary: 'Presupuesto #' + quote.quote_number + ' rechazado, pero el aviso no pudo enviarse a ' + contact.email + '. Motivo: ' + emailResult.reason })
  return res.status(200).json({ ok: true, rejected: true, emailSent: false, message: 'La propuesta quedó rechazada, pero el correo no pudo enviarse.', emailError: emailResult.reason })
}
