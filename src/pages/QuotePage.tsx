import { useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, CheckCircle2, ClipboardCopy, FileText, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SiteFooter, SiteHeader } from '../components/SiteShell'

type Brief = { name:string; email:string; organization:string; service:string; budget:string; timing:string; description:string; features:string }
const initial:Brief = { name:'', email:'', organization:'', service:'', budget:'', timing:'', description:'', features:'' }
export default function QuotePage() {
  const [data,setData] = useState(initial)
  const [copied,setCopied] = useState(false)
  const [consent,setConsent] = useState(false)
  const [website,setWebsite] = useState('')
  const [sending,setSending] = useState(false)
  const [sent,setSent] = useState(false)
  const [feedback,setFeedback] = useState('')
  const update = (key:keyof Brief,value:string) => { setData(old=>({...old,[key]:value})); setCopied(false); setSent(false); setFeedback('') }
  const message = useMemo(()=>`SOLICITUD INICIAL DE PROYECTO · CODEXIA SYSTEMS\n\nNombre: ${data.name}\nCorreo: ${data.email}\nOrganización: ${data.organization||'No indicado'}\nServicio: ${data.service}\nPresupuesto orientativo: ${data.budget||'Por definir'}\nPlazo deseado: ${data.timing||'Por definir'}\n\nDescripción:\n${data.description}\n\nFunciones o necesidades:\n${data.features||'Por definir'}`, [data])
  const valid = !!(data.name.trim().length>=2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) && data.service && data.description.trim().length>=20 && consent)
  async function copy() { try { await navigator.clipboard.writeText(message); setCopied(true); setFeedback('Resumen copiado. Puedes conservarlo como respaldo.'); } catch { setCopied(false); setFeedback('No se pudo acceder al portapapeles. Puedes seleccionar y copiar los datos manualmente.'); } }
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!valid || sending) return
    setSending(true); setFeedback('')
    try {
      const response = await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:data.name,email:data.email,organization:data.organization,service:data.service,budget:data.budget,timing:data.timing,description:data.description,features:data.features,website,consent})})
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo enviar la solicitud.')
      setSent(true); setFeedback(result.message || 'Solicitud enviada correctamente.')
    } catch(error) { setFeedback(`${error instanceof Error?error.message:'No se pudo enviar la solicitud.'} Puedes copiar el resumen y enviarlo por otro medio.`) }
    finally { setSending(false) }
  }
  return <><SiteHeader/><main id="contenido" className="section-wrap editorial-page quote-page"><div className="section-kicker">INICIAR UN PROYECTO / SOLICITUD DE PRESUPUESTO</div><h1 className="internal-title">Démosle forma a <em>tu idea.</em></h1><p className="internal-intro">Comparte la información inicial para entender qué necesitas. No es una cotización automática ni genera un compromiso: revisaremos el alcance antes de preparar una propuesta.</p><div className="quote-layout"><aside className="quote-aside"><div className="quote-aside-icon"><FileText/></div><h2>Una buena propuesta empieza por entender el problema.</h2><p>Cuanto más claro sea el contexto, mejor podremos valorar el alcance y las siguientes preguntas.</p><ol><li>Describe la necesidad.</li><li>Indica quién utilizará la solución.</li><li>Comparte prioridades y restricciones.</li><li>Revisaremos la información antes de estimar.</li></ol><div className="quote-caution">No incluyas contraseñas, datos bancarios, documentos de identidad ni información confidencial en este formulario.</div><Link to="/contratacion" className="inline-link"><ArrowLeft size={15}/> Conoce el proceso de trabajo</Link></aside><form className="quote-form" onSubmit={submit}>
    <label className="honeypot" aria-hidden="true">No rellenar<input tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></label>
    <div className="form-heading"><span>BRIEF INICIAL</span><small>* Campos obligatorios</small></div>
    <div className="form-row"><label>Nombre completo *<input required minLength={2} maxLength={100} autoComplete="name" value={data.name} onChange={e=>update('name',e.target.value)} placeholder="Cómo te llamas"/></label><label>Correo electrónico *<input required type="email" maxLength={160} autoComplete="email" value={data.email} onChange={e=>update('email',e.target.value)} placeholder="nombre@empresa.com"/></label></div>
    <label>Empresa o proyecto <span className="field-hint">(opcional)</span><input maxLength={140} value={data.organization} onChange={e=>update('organization',e.target.value)} placeholder="Nombre del negocio o iniciativa"/></label>
    <div className="form-row"><label>¿Qué necesitas? *<select required value={data.service} onChange={e=>update('service',e.target.value)}><option value="">Selecciona un servicio</option><option>Desarrollo de software a medida</option><option>Aplicación web o móvil</option><option>Inteligencia artificial</option><option>Automatización de procesos</option><option>Diseño de producto digital</option><option>Mantenimiento o mejora de un sistema</option><option>Otro / Necesito orientación</option></select></label><label>Presupuesto estimado<select value={data.budget} onChange={e=>update('budget',e.target.value)}><option value="">Prefiero definirlo después</option><option>30–50 USD</option><option>50–100 USD</option><option>100–300 USD</option><option>300–500 USD</option><option>500–1 500 USD</option><option>1 500–5 000 USD</option><option>Más de 5 000 USD</option><option>Necesito orientación</option></select></label></div><p className="field-hint">Referencia orientativa, no requisito para contratar. Valoraremos cada solicitud según su alcance y necesidades.</p>
    <label>¿Cuándo te gustaría comenzar?<select value={data.timing} onChange={e=>update('timing',e.target.value)}><option value="">Sin fecha definida</option><option>Lo antes posible</option><option>En las próximas 2–4 semanas</option><option>En 1–3 meses</option><option>Más adelante</option></select></label>
    <label>Cuéntanos qué problema quieres resolver *<textarea required minLength={20} maxLength={2500} value={data.description} onChange={e=>update('description',e.target.value)} placeholder="Describe la situación actual, qué te gustaría conseguir y por qué..."/><small className="field-hint">Mínimo 20 caracteres. {data.description.length}/2500</small></label>
    <label>Funciones o características que imaginas <span className="field-hint">(opcional)</span><textarea maxLength={1800} value={data.features} onChange={e=>update('features',e.target.value)} placeholder="Ej.: usuarios, panel administrativo, reportes, integración con otras herramientas..."/></label>
    <label className="privacy-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>Autorizo el uso de estos datos exclusivamente para evaluar y responder esta solicitud. *</span></label><p className="privacy-consent-note"><Link to="/privacidad">Leer información de privacidad</Link></p>
    <div className="quote-actions"><button className="button button-primary" type="submit" disabled={!valid||sending}>{sending?'Enviando…':sent?'Enviado correctamente':'Enviar solicitud'} <Send size={16}/></button><button className="copy-button" type="button" onClick={()=>void copy()}><ClipboardCopy size={15}/> Copiar resumen</button></div>
    {feedback&&<p className={sent||copied?'quote-feedback':'form-feedback'} role="status">{(sent||copied)&&<CheckCircle2 size={16}/>} {feedback}</p>}
    <p className="privacy-note">Los datos se utilizan únicamente para evaluar y responder esta solicitud. El registro requiere que Codexia conecte su base de datos privada. La notificación por correo se activa por separado. No incluyas información confidencial.</p>
  </form></div></main><SiteFooter/></>
}
