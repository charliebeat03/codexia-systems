import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Bell, Check, ChevronRight, Mail, RefreshCw, Send, X } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { isStaffRole, supabase } from '../lib/supabase'
import './crm-inbox.css'

type Lead = {
  id: string
  name: string
  email: string
  organization: string | null
  service: string
  details: string
  features: string | null
  created_at: string
}
type Notification = { id: string; lead_id: string; title: string; body: string; read_at: string | null; created_at: string }

export default function CRMInbox() {
  const { user, session, role } = useAuth()
  const staff = isStaffRole(role)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [selected, setSelected] = useState<Lead | null>(null)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const unread = useMemo(() => notifications.filter(item => !item.read_at).length, [notifications])

  const load = useCallback(async () => {
    if (!supabase || !user || !staff) return
    const db = supabase as any
    const [notificationResult, leadResult] = await Promise.all([
      db.from('crm_notifications').select('id,lead_id,title,body,read_at,created_at').order('created_at', { ascending: false }).limit(40),
      db.from('leads').select('id,name,email,organization,service,details,features,created_at').order('created_at', { ascending: false }).limit(80),
    ])
    if (notificationResult.error || leadResult.error) {
      setError('No se pudo cargar la bandeja del CRM. Comprueba los permisos y la conexión.')
      return
    }
    setNotifications(notificationResult.data || [])
    setLeads(leadResult.data || [])
  }, [user, staff])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!supabase || !staff) return
    const channel = supabase.channel('crm-inbox-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crm_notifications' }, () => {
        setNotice('Ha llegado una nueva consulta.')
        void load()
      })
      .subscribe()
    return () => { void supabase?.removeChannel(channel) }
  }, [staff, load])

  async function openLead(lead: Lead, notification?: Notification) {
    setSelected(lead)
    setSubject('Re: Tu consulta sobre ' + lead.service + ' | Codexia Systems')
    setMessage('')
    setError('')
    setNotice('')
    if (notification && !notification.read_at && supabase) {
      const now = new Date().toISOString()
      const { error: updateError } = await (supabase as any).from('crm_notifications').update({ read_at: now }).eq('id', notification.id)
      if (!updateError) setNotifications(rows => rows.map(row => row.id === notification.id ? { ...row, read_at: now } : row))
    }
  }

  async function sendReply(event: FormEvent) {
    event.preventDefault()
    if (!selected || !session?.access_token || !message.trim() || !subject.trim()) return
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/crm/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify({ leadId: selected.id, subject: subject.trim(), message: message.trim() }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.ok) throw new Error(result.error || 'No se pudo enviar el correo.')
      setNotice('Respuesta enviada a ' + selected.email + ' desde Contact · Codexia Systems.')
      setMessage('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo enviar el correo.')
    } finally { setBusy(false) }
  }

  if (!staff || !user) return null

  return <div className="crm-inbox-root">
    <button type="button" className="crm-inbox-bell" aria-label={'Notificaciones del CRM, ' + unread + ' sin leer'} aria-expanded={open} onClick={() => { setOpen(value => !value); if (!open) void load() }}>
      <Bell size={19}/>{unread > 0 && <span>{unread > 99 ? '99+' : unread}</span>}
    </button>
    {open && <section className="crm-inbox-panel" aria-label="Bandeja de notificaciones del CRM">
      <header><div><strong>Bandeja del CRM</strong><small>{unread} sin leer · {leads.length} consultas</small></div><div><button type="button" aria-label="Actualizar" onClick={() => void load()}><RefreshCw size={16}/></button><button type="button" aria-label="Cerrar" onClick={() => setOpen(false)}><X size={18}/></button></div></header>
      {error && <p className="crm-inbox-error" role="alert">{error}</p>}
      {notice && <p className="crm-inbox-notice" role="status">{notice}</p>}
      {selected ? <div className="crm-inbox-compose">
        <button type="button" className="crm-inbox-back" onClick={() => { setSelected(null); setError(''); setNotice('') }}>← Volver a consultas</button>
        <div className="crm-inbox-recipient"><strong>{selected.name}</strong><small>{selected.email}</small><small>{selected.service} · {new Date(selected.created_at).toLocaleString('es')}</small></div>
        <div className="crm-inbox-original"><strong>Consulta original</strong><p>{selected.details}</p>{selected.features && <p><b>Funciones:</b> {selected.features}</p>}</div>
        <form onSubmit={sendReply}>
          <label>Asunto<input required maxLength={180} value={subject} onChange={event => setSubject(event.target.value)}/></label>
          <label>Tu respuesta<textarea required minLength={2} maxLength={8000} rows={7} value={message} onChange={event => setMessage(event.target.value)} placeholder="Escribe una respuesta clara y profesional…"/></label>
          <small className="crm-inbox-sender">Se enviará desde Contact · Codexia Systems mediante el servicio de correo oficial.</small>
          <button type="submit" className="crm-inbox-send" disabled={busy || !message.trim()}><Send size={15}/>{busy ? 'Enviando…' : 'Enviar respuesta'}</button>
        </form>
      </div> : <div className="crm-inbox-list">
        <div className="crm-inbox-section-title">Notificaciones recientes</div>
        {notifications.map(item => {
          const lead = leads.find(row => row.id === item.lead_id)
          return <button type="button" className={'crm-inbox-item' + (item.read_at ? '' : ' unread')} key={item.id} onClick={() => lead ? void openLead(lead, item) : void load()}>
            <span className="crm-inbox-item-icon"><Mail size={16}/></span><span><strong>{item.title}</strong><small>{item.body}</small><small>{new Date(item.created_at).toLocaleString('es')}</small></span>{!item.read_at && <i/>}<ChevronRight size={15}/>
          </button>
        })}
        {!notifications.length && <p className="crm-inbox-empty">Todavía no hay notificaciones nuevas.</p>}
        <div className="crm-inbox-section-title">Consultas recibidas</div>
        {leads.map(lead => <button type="button" className="crm-inbox-lead" key={lead.id} onClick={() => void openLead(lead)}><span><strong>{lead.name}</strong><small>{lead.service} · {lead.email}</small></span><ChevronRight size={15}/></button>)}
        {!leads.length && <p className="crm-inbox-empty">No hay consultas registradas.</p>}
      </div>}
      <footer><Check size={14}/> Sincronización en tiempo real mediante Supabase</footer>
    </section>}
  </div>
}
