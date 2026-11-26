import { useState, type FormEvent } from 'react'
import { ArrowLeft, Check, Clipboard, Mail, MessageSquareText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SiteFooter, SiteHeader } from '../components/SiteShell'

const serviceOptions = ['Desarrollo de software', 'Inteligencia artificial', 'Aplicación o plataforma', 'Automatización de procesos', 'Consultoría / análisis', 'No estoy seguro todavía']

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', service: '', budget: '', details: '' })
  const [feedback, setFeedback] = useState('')
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [website, setWebsite] = useState('')
  const [consent, setConsent] = useState(false)
  const update = (field: keyof typeof form, value: string) => { setForm(current => ({ ...current, [field]: value })); setCopied(false); setSent(false); setFeedback('') }
  const message = `Hola, Codexia Systems.\n\nQuisiera conversar sobre un proyecto.\n\nNombre: ${form.name}\nCorreo: ${form.email}\nServicio: ${form.service}\nPresupuesto aproximado: ${form.budget || 'Por definir'}\n\nDescripción:\n${form.details}\n\nEnviado desde el formulario de codexiasystems.dpdns.org.`
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFeedback('')
    setSending(true)
    try {
      const response = await fetch('/api/contact', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...form, website, consent}) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo enviar el mensaje.')
      setSent(true)
      setFeedback(result.message || 'Tu consulta fue enviada correctamente.')
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'No se pudo enviar el mensaje.'
      setFeedback(`${reason} Puedes copiar el resumen y enviarlo por otro medio.`)
    } finally { setSending(false) }
  }
  async function copySummary() {
    try { await navigator.clipboard.writeText(message); setCopied(true); setFeedback('Resumen copiado. Ya puedes pegarlo donde prefieras.') }
    catch { setFeedback('No se pudo acceder al portapapeles. Selecciona y copia los datos manualmente.') }
  }

  return <><SiteHeader/><main id="contenido" className="section-wrap internal-main contact-page"><Link className="back-link" to="/"><ArrowLeft size={15}/> Volver al inicio</Link><div className="section-kicker">06 / CONTACTO</div><h1 className="internal-title">Cuéntanos qué quieres <em>construir.</em></h1><p className="internal-intro">Un buen proyecto comienza entendiendo el problema. Comparte algunos detalles para que podamos revisar tu solicitud.</p>
    <div className="contact-layout"><aside className="contact-aside"><div className="contact-aside-icon"><MessageSquareText/></div><h2>Hablemos de tu idea.</h2><p>No necesitas tener todos los detalles resueltos. Podemos ayudarte a definir el alcance y encontrar un camino viable.</p><div className="contact-aside-point"><Check size={16}/> Primera conversación sin compromiso</div><div className="contact-aside-point"><Check size={16}/> Alcance adaptado a tus necesidades</div><div className="contact-aside-point"><Check size={16}/> Comunicación clara durante el proceso</div><div className="contact-aside-note"><Mail size={17}/><span>Tu consulta queda registrada para revisión. Normalmente responderemos en un plazo de 1 a 3 días hábiles al correo que indiques. La confirmación automática por correo se habilitará al terminar la configuración del servicio de notificaciones.</span></div></aside>
      <form className="contact-form" onSubmit={submit}>
        <label className="honeypot" aria-hidden="true">No rellenar<input tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></label>
        <div className="form-heading"><span>FORMULARIO DE PROYECTO</span><small>Los campos marcados con * son obligatorios</small></div>
        <div className="form-row"><label>Nombre o negocio *<input required minLength={2} maxLength={80} autoComplete="name" value={form.name} onChange={e=>update('name',e.target.value)} placeholder="¿Cómo te llamas?"/></label><label>Correo electrónico *<input required type="email" maxLength={120} autoComplete="email" value={form.email} onChange={e=>update('email',e.target.value)} placeholder="nombre@ejemplo.com"/></label></div>
        <div className="form-row"><label>¿Qué necesitas? *<select required value={form.service} onChange={e=>update('service',e.target.value)}><option value="">Selecciona un área</option>{serviceOptions.map(x=><option key={x}>{x}</option>)}</select></label><label>Presupuesto aproximado<select value={form.budget} onChange={e=>update('budget',e.target.value)}><option value="">Prefiero conversarlo</option><option>Menos de 500 USD</option><option>500 a 1 500 USD</option><option>1 500 a 5 000 USD</option><option>Más de 5 000 USD</option></select></label></div>
        <label>Cuéntanos sobre tu idea *<textarea required minLength={20} maxLength={2500} rows={6} value={form.details} onChange={e=>update('details',e.target.value)} placeholder="¿Qué problema quieres resolver? ¿Quién utilizará la solución? ¿Hay alguna fecha importante?"/><small className="field-hint">Entre 20 y 2500 caracteres. No incluyas contraseñas ni información confidencial.</small></label>
        <label className="privacy-consent"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/> <span>Autorizo a Codexia Systems a utilizar estos datos para responder a mi consulta. *</span></label><p className="privacy-consent-note"><Link to="/privacidad">Leer información de privacidad</Link></p>
        <div className="form-actions"><button className="button button-primary form-submit" type="submit" disabled={sending}>{sending ? 'Enviando…' : sent ? 'Enviado correctamente' : 'Enviar consulta'} {sent ? <Check size={17}/> : <Mail size={17}/>}</button><button className="copy-button" type="button" onClick={copySummary}><Clipboard size={15}/> Copiar resumen</button></div>
        {feedback && <p className={sent || copied ? 'form-feedback success' : 'form-feedback'} role="status">{feedback}</p>}
        <small className="privacy-note">Revisaremos tu consulta y normalmente responderemos en un plazo de 1 a 3 días hábiles al correo indicado. La confirmación automática por correo se habilitará al terminar la configuración del servicio. No incluyas contraseñas ni información confidencial.</small>
      </form>
    </div>
  </main><SiteFooter/></>
}
