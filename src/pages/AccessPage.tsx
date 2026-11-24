import { useState, type FormEvent } from 'react'
import { ArrowLeft, KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { SiteFooter, SiteHeader } from '../components/SiteShell'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export default function AccessPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<'login'|'recovery'|'new-password'>(searchParams.has('recuperar') || searchParams.has('set-password') ? 'new-password' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [success, setSuccess] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true); setFeedback(''); setSuccess(false)
    try {
      if (mode === 'new-password') {
        if (password.length < 10) throw new Error('La contraseña debe tener al menos 10 caracteres.')
        if (password !== confirmation) throw new Error('Las contraseñas no coinciden.')
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        setSuccess(true); setFeedback('Contraseña actualizada. Ya puedes acceder a tu espacio.'); setMode('login'); setPassword(''); setConfirmation('')
      } else if (mode === 'recovery') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/acceso?recuperar=1` })
        if (error) throw error
        setSuccess(true); setFeedback('Si existe una cuenta para ese correo, recibirás instrucciones para restablecer la contraseña.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate('/panel')
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo completar la operación.')
    } finally { setBusy(false) }
  }

  return <><SiteHeader/><main id="contenido" className="section-wrap editorial-page auth-page"><Link className="back-link" to="/"><ArrowLeft size={15}/> Volver al sitio</Link><div className="auth-card"><div className="auth-icon"><ShieldCheck size={25}/></div><div className="section-kicker">ÁREA PRIVADA / CODEXIA SYSTEMS</div><h1 className="internal-title">{mode === 'login' ? <>Accede a tu <em>espacio.</em></> : mode === 'new-password' ? <>Crea una nueva <em>contraseña.</em></> : <>Recuperar <em>acceso.</em></>}</h1><p className="internal-intro">{mode === 'login' ? 'Acceso exclusivo para clientes y miembros autorizados del equipo.' : mode === 'new-password' ? 'Elige una contraseña segura para proteger tu cuenta.' : 'Te enviaremos un enlace para restablecer tu contraseña.'}</p>
    {!isSupabaseConfigured ? <div className="auth-alert" role="status"><LockKeyhole size={18}/><div><strong>Autenticación todavía no conectada</strong><p>El acceso estará disponible cuando configuremos las variables públicas de Supabase en Vercel.</p></div></div> : <form className="auth-form" onSubmit={submit}>
      {mode !== 'new-password' && <label>Correo electrónico<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@correo.com"/></label>}
      {mode !== 'recovery' && <label>{mode === 'new-password' ? 'Nueva contraseña' : 'Contraseña'}<input required type="password" minLength={mode === 'new-password' ? 10 : 8} autoComplete={mode === 'new-password' ? 'new-password' : 'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode === 'new-password' ? 'Mínimo 10 caracteres' : 'Tu contraseña'}/></label>}
      {mode === 'new-password' && <label>Confirmar contraseña<input required type="password" minLength={10} autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} placeholder="Repite la contraseña"/></label>}
      <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Procesando…' : mode === 'login' ? 'Iniciar sesión' : mode === 'new-password' ? 'Guardar contraseña' : 'Enviar instrucciones'} {mode === 'recovery' ? <Mail size={16}/> : <KeyRound size={16}/>}</button>
      {feedback && <p className={success?'auth-feedback success':'auth-feedback'} role="status">{feedback}</p>}
      {mode !== 'new-password' && <button type="button" className="auth-switch" onClick={()=>{setMode(mode==='login'?'recovery':'login');setFeedback('');setSuccess(false)}}>{mode==='login'?'¿Olvidaste tu contraseña?':'Volver al inicio de sesión'}</button>}
    </form>}
    <p className="auth-footnote">Las cuentas son creadas o invitadas por el equipo. No existe registro público ni asignación de roles desde esta página.</p>
  </div></main><SiteFooter/></>
}
