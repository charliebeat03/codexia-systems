import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Activity, ArrowDownToLine, BriefcaseBusiness, CheckCircle2, CircleAlert, FileText, FolderKanban, LogOut, Plus, RefreshCw, Send, ShieldCheck, Trash2, Users } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { SiteFooter, SiteHeader } from '../components/SiteShell'
import { useAuth } from '../auth/AuthProvider'
import { isAdminRole, isStaffRole, supabase } from '../lib/supabase'
import type { TableRow } from '../lib/database.types'

type Lead = Omit<TableRow<'leads'>, 'status'> & { status: 'new'|'reviewing'|'proposal'|'won'|'closed' }
type Project = Omit<TableRow<'projects'>, 'status'> & { status: 'planning'|'active'|'paused'|'completed'|'archived' }
type Profile = Pick<TableRow<'profiles'>, 'id'|'email'|'display_name'|'role'>
type Update = Omit<TableRow<'project_updates'>, 'visibility'> & { visibility: 'internal'|'client' }
type DocumentRow = Omit<TableRow<'project_documents'>, 'visibility'> & { visibility: 'internal'|'client' }
const leadStatuses = [{value:'new',label:'Nueva'},{value:'reviewing',label:'En revisión'},{value:'proposal',label:'Propuesta'},{value:'won',label:'Convertida'},{value:'closed',label:'Cerrada'}]
const projectStatuses = [{value:'planning',label:'Planificación'},{value:'active',label:'Activo'},{value:'paused',label:'Pausado'},{value:'completed',label:'Completado'},{value:'archived',label:'Archivado'}]
const dateLabel = (value:string) => new Intl.DateTimeFormat('es',{dateStyle:'medium'}).format(new Date(value))

export default function PortalPage() {
  const { user, session, role, loading, configured, signOut } = useAuth()
  const staff = isStaffRole(role)
  const admin = isAdminRole(role)
  const [leads,setLeads] = useState<Lead[]>([])
  const [projects,setProjects] = useState<Project[]>([])
  const [profiles,setProfiles] = useState<Profile[]>([])
  const [updates,setUpdates] = useState<Update[]>([])
  const [documents,setDocuments] = useState<DocumentRow[]>([])
  const [selectedProject,setSelectedProject] = useState('')
  const [busy,setBusy] = useState(false)
  const [feedback,setFeedback] = useState('')
  const [error,setError] = useState('')
  const [tab,setTab] = useState<'overview'|'leads'|'projects'|'updates'|'users'>('overview')
  const [showProjectForm,setShowProjectForm] = useState(false)
  const [projectForm,setProjectForm] = useState({name:'',summary:'',client_id:'',target_date:''})
  const [updateForm,setUpdateForm] = useState({title:'',body:'',visibility:'client' as 'client'|'internal'})
  const [file,setFile] = useState<File|null>(null)
  const [fileVisibility,setFileVisibility] = useState<'client'|'internal'>('client')
  const [inviteForm,setInviteForm] = useState({displayName:'',email:'',role:'client' as 'client'|'team'|'admin'})
  const [inviteBusy,setInviteBusy] = useState(false)

  const load = useCallback(async () => {
    if (!supabase || !user) return
    setBusy(true); setError('')
    try {
      const projectQuery = supabase.from('projects').select('*').order('created_at',{ascending:false})
      const [projectResult, leadResult, profileResult] = await Promise.all([
        projectQuery,
        staff ? supabase.from('leads').select('*').order('created_at',{ascending:false}).limit(100) : Promise.resolve({data:[],error:null} as any),
        staff ? supabase.from('profiles').select('id,email,display_name,role').order('display_name') : Promise.resolve({data:[],error:null} as any),
      ])
      if (projectResult.error) throw projectResult.error
      if (leadResult.error) throw leadResult.error
      if (profileResult.error) throw profileResult.error
      const projectRows = (projectResult.data || []) as Project[]
      setProjects(projectRows); setLeads((leadResult.data || []) as Lead[]); setProfiles((profileResult.data || []) as Profile[])
      const ids = projectRows.map(project=>project.id)
      if (ids.length) {
        const [updatesResult,documentsResult] = await Promise.all([
          supabase.from('project_updates').select('*').in('project_id',ids).order('created_at',{ascending:false}),
          supabase.from('project_documents').select('*').in('project_id',ids).order('created_at',{ascending:false}),
        ])
        if (updatesResult.error) throw updatesResult.error
        if (documentsResult.error) throw documentsResult.error
        setUpdates((updatesResult.data || []) as Update[]); setDocuments((documentsResult.data || []) as DocumentRow[])
      } else { setUpdates([]); setDocuments([]) }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los datos del portal.')
    } finally { setBusy(false) }
  },[user,staff])

  useEffect(()=>{ if (user && configured) void load() },[user,configured,load])
  useEffect(()=>{ if (!selectedProject && projects[0]) setSelectedProject(projects[0].id) },[projects,selectedProject])
  const selected = useMemo(()=>projects.find(project=>project.id===selectedProject) || projects[0] || null,[projects,selectedProject])
  const visibleUpdates = useMemo(()=>updates.filter(update=>update.project_id===selected?.id),[updates,selected])
  const visibleDocuments = useMemo(()=>documents.filter(document=>document.project_id===selected?.id),[documents,selected])
  const profileName = profiles.find(profile=>profile.id===user?.id)?.display_name?.trim() || user?.user_metadata?.full_name?.trim() || 'Usuario'

  async function logActivity(entityType:string,entityId:string,action:string,summary:string) {
    if (!supabase || !user) return
    const { error:logError } = await supabase.from('activity_log').insert({actor_id:user.id,entity_type:entityType,entity_id:entityId,action,summary})
    if (logError) console.warn('No se pudo registrar la actividad',logError.message)
  }

  async function updateLeadStatus(lead:Lead,status:Lead['status']) {
    if (!supabase || !admin) return
    setError(''); setFeedback('')
    const {error:changeError} = await supabase.from('leads').update({status}).eq('id',lead.id)
    if (changeError) {setError(changeError.message);return}
    await logActivity('lead',lead.id,'status_changed',`Estado de consulta actualizado: ${status}`)
    setFeedback('Estado de la consulta actualizado.'); await load()
  }

  async function createProject(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase || !user || !admin) return
    setBusy(true); setError(''); setFeedback('')
    const {data,error:createError} = await supabase.from('projects').insert({name:projectForm.name.trim(),summary:projectForm.summary.trim(),client_id:projectForm.client_id || null,target_date:projectForm.target_date || null,status:'planning',progress:0}).select().single()
    if (createError) {setError(createError.message);setBusy(false);return}
    await logActivity('project',data.id,'created',`Proyecto creado: ${data.name}`)
    setProjectForm({name:'',summary:'',client_id:'',target_date:''});setShowProjectForm(false);setSelectedProject(data.id);setFeedback('Proyecto creado correctamente.');await load()
  }

  async function changeProjectStatus(status:Project['status']) {
    if (!supabase || !selected || !staff) return
    const {error:changeError} = await supabase.from('projects').update({status}).eq('id',selected.id)
    if (changeError) {setError(changeError.message);return}
    await logActivity('project',selected.id,'status_changed',`Estado del proyecto actualizado: ${status}`)
    setFeedback('Estado del proyecto actualizado.'); await load()
  }

  async function changeProgress(value:number) {
    if (!supabase || !selected || !staff) return
    const {error:changeError} = await supabase.from('projects').update({progress:value}).eq('id',selected.id)
    if (changeError) {setError(changeError.message);return}
    await logActivity('project',selected.id,'progress_changed',`Progreso actualizado a ${value}%`)
    setFeedback('Progreso actualizado.'); await load()
  }

  async function createUpdate(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase || !user || !selected || !staff) return
    setBusy(true);setError('');setFeedback('')
    const {data,error:createError} = await supabase.from('project_updates').insert({project_id:selected.id,author_id:user.id,title:updateForm.title.trim(),body:updateForm.body.trim(),visibility:updateForm.visibility}).select().single()
    if (createError) {setError(createError.message);setBusy(false);return}
    await logActivity('project_update',data.id,'created',`Actualización publicada: ${data.title}`)
    setUpdateForm({title:'',body:'',visibility:'client'});setFeedback('Actualización publicada.');await load()
  }

  async function uploadDocument(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase || !user || !selected || !staff || !file) return
    if (file.size > 10*1024*1024) {setError('El archivo supera el límite de 10 MB.');return}
    const allowed = ['application/pdf','image/jpeg','image/png','image/webp','text/plain','application/zip']
    if (!allowed.includes(file.type)) {setError('Tipo de archivo no permitido.');return}
    setBusy(true);setError('');setFeedback('')
    const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-100) || 'archivo'
    const storagePath = `${selected.id}/${crypto.randomUUID()}-${safeName}`
    const {error:uploadError} = await supabase.storage.from('project-documents').upload(storagePath,file,{contentType:file.type,upsert:false})
    if (uploadError) {setError(uploadError.message);setBusy(false);return}
    const {data,error:metadataError} = await supabase.from('project_documents').insert({project_id:selected.id,uploaded_by:user.id,storage_path:storagePath,file_name:file.name,content_type:file.type,visibility:fileVisibility}).select().single()
    if (metadataError) {
      await supabase.storage.from('project-documents').remove([storagePath])
      setError(`El archivo se subió pero no se pudo registrar. Se intentó revertir la carga: ${metadataError.message}`);setBusy(false);return
    }
    await logActivity('project_document',data.id,'uploaded',`Documento añadido: ${file.name}`)
    setFile(null);setFeedback('Documento añadido al proyecto.');await load()
  }

  async function openDocument(document:DocumentRow) {
    if (!supabase) return
    const {data,error:downloadError} = await supabase.storage.from('project-documents').createSignedUrl(document.storage_path,60)
    if (downloadError || !data?.signedUrl) {setError(downloadError?.message || 'No se pudo generar el enlace privado.');return}
    window.open(data.signedUrl,'_blank','noopener,noreferrer')
  }

  async function inviteUser(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!session || !admin) return
    setInviteBusy(true);setError('');setFeedback('')
    try {
      const response = await fetch('/api/admin/users',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({email:inviteForm.email,displayName:inviteForm.displayName,role:inviteForm.role})})
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo enviar la invitación.')
      setInviteForm({displayName:'',email:'',role:'client'});setFeedback(result.message || 'Invitación enviada.');await load()
    } catch(err) { setError(err instanceof Error?err.message:'No se pudo invitar al usuario.') }
    finally {setInviteBusy(false)}
  }

  async function deleteProject(project:Project) {
    if (!session || !admin) return
    const confirmed = window.confirm('¿Eliminar definitivamente “' + project.name + '”? Se borrarán sus actualizaciones y documentos asociados. Esta acción no se puede deshacer.')
    if (!confirmed) return
    setBusy(true);setError('');setFeedback('')
    try {
      const response = await fetch('/api/admin/projects',{method:'DELETE',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({projectId:project.id})})
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo eliminar el proyecto.')
      setSelectedProject('')
      setFeedback(result.message || 'Proyecto eliminado.')
      await load()
    } catch(err) { setError(err instanceof Error?err.message:'No se pudo eliminar el proyecto.') }
    finally { setBusy(false) }
  }

  async function deleteUser(profile:Profile) {
    if (!session || !admin || profile.id===user?.id || profile.role==='owner') return
    if (role!=='owner' && profile.role!=='client' && profile.role!=='team') return
    const confirmed = window.confirm('¿Eliminar definitivamente la cuenta de ' + (profile.display_name || profile.email) + '? Sus proyectos se conservarán, pero quedarán sin cliente asignado. Un token de sesión ya emitido podría seguir vigente hasta expirar. Esta acción no se puede deshacer.')
    if (!confirmed) return
    setInviteBusy(true);setError('');setFeedback('')
    try {
      const response = await fetch('/api/admin/users',{method:'DELETE',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({userId:profile.id})})
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo eliminar la cuenta.')
      setFeedback(result.message || 'Cuenta eliminada.')
      await load()
    } catch(err) { setError(err instanceof Error?err.message:'No se pudo eliminar la cuenta.') }
    finally { setInviteBusy(false) }
  }
  async function changeUserRole(profile:Profile,nextRole:'client'|'team'|'admin') {
    if (!session || !admin) return
    setError('');setFeedback('')
    try {
      const response = await fetch('/api/admin/users',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({userId:profile.id,role:nextRole})})
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo cambiar el rol.')
      setFeedback(result.message || 'Rol actualizado.');await load()
    } catch(err) {setError(err instanceof Error?err.message:'No se pudo cambiar el rol.')}
  }

  if (loading) return <><SiteHeader/><main className="section-wrap portal-loading"><RefreshCw className="spin"/> Preparando tu espacio…</main><SiteFooter/></>
  if (!user) return <Navigate to="/acceso" replace/>
  if (!configured || !supabase) return <><SiteHeader/><main className="section-wrap portal-loading"><CircleAlert/> La conexión con la plataforma todavía no está configurada. <Link to="/acceso">Volver al acceso</Link></main><SiteFooter/></>

  return <><SiteHeader/><main id="contenido" className="section-wrap portal-page">
    <div className="portal-top"><div><div className="section-kicker">CODEXIA SYSTEMS / ÁREA PRIVADA</div><h1 className="internal-title">Hola, <em>{String(profileName).split(' ')[0]}.</em></h1><p className="internal-intro">{staff?'Gestiona consultas, proyectos y comunicación con clientes.':'Aquí puedes seguir el estado de tus proyectos y consultar sus documentos.'}</p></div><div className="portal-top-actions"><span className="role-pill"><ShieldCheck size={14}/>{role==='owner'?'Propietario':role==='admin'?'Administrador':role==='team'?'Equipo':'Cliente'}</span>{staff&&<Link className="copy-button" to="/panel/crm"><BriefcaseBusiness size={15}/> Abrir CRM</Link>}<button className="copy-button" onClick={()=>void signOut()}><LogOut size={15}/> Cerrar sesión</button></div></div>
    {error&&<div className="portal-alert error" role="alert"><CircleAlert size={17}/>{error}</div>}{feedback&&<div className="portal-alert success" role="status"><CheckCircle2 size={17}/>{feedback}</div>}
    {staff&&<div className="portal-stats"><article><span><Users size={16}/> Consultas</span><strong>{leads.length}</strong><small>{leads.filter(lead=>lead.status==='new').length} nuevas</small></article><article><span><FolderKanban size={16}/> Proyectos</span><strong>{projects.length}</strong><small>{projects.filter(project=>project.status==='active').length} activos</small></article><article><span><Activity size={16}/> Actualizaciones</span><strong>{updates.length}</strong><small>En todos los proyectos</small></article></div>}
    {staff&&<nav className="portal-tabs" aria-label="Secciones del panel">{([{id:'overview',label:'Resumen'},{id:'leads',label:'Consultas'},{id:'projects',label:'Proyectos'},{id:'updates',label:'Actualizaciones'},...(admin?[{id:'users',label:'Usuarios'} as const]:[])] as const).map(item=><button type="button" key={item.id} aria-pressed={tab===item.id} className={tab===item.id?'active':''} onClick={()=>setTab(item.id)}>{item.label}</button>)}</nav>}
    {(!staff||tab==='overview'||tab==='projects'||tab==='updates')&&<section className="portal-section"><div className="portal-section-heading"><div><div className="section-kicker">{staff?'SEGUIMIENTO':'TU ESPACIO'}</div><h2>{staff&&tab==='overview'?'Proyectos recientes':staff&&tab==='updates'?'Comunicación de proyectos':'Tus proyectos'}</h2></div>{staff&&admin&&<button className="button button-primary" onClick={()=>setShowProjectForm(!showProjectForm)}><Plus size={16}/> Nuevo proyecto</button>}</div><p className="portal-muted">Los proyectos completados o archivados permanecen en el historial. Eliminar es definitivo y también retira sus documentos.</p>
      {showProjectForm&&<form className="portal-editor" onSubmit={createProject}><div className="form-row"><label>Nombre del proyecto *<input required maxLength={120} value={projectForm.name} onChange={e=>setProjectForm(old=>({...old,name:e.target.value}))}/></label><label>Cliente<select value={projectForm.client_id} onChange={e=>setProjectForm(old=>({...old,client_id:e.target.value}))}><option value="">Sin asignar</option>{profiles.filter(profile=>profile.role==='client').map(profile=><option key={profile.id} value={profile.id}>{profile.display_name||profile.id}</option>)}</select></label></div><label>Resumen<textarea rows={3} maxLength={1000} value={projectForm.summary} onChange={e=>setProjectForm(old=>({...old,summary:e.target.value}))}/></label><label>Fecha objetivo<input type="date" value={projectForm.target_date} onChange={e=>setProjectForm(old=>({...old,target_date:e.target.value}))}/></label><div className="portal-form-actions"><button className="button button-primary" disabled={busy}>Crear proyecto</button><button type="button" className="copy-button" onClick={()=>setShowProjectForm(false)}>Cancelar</button></div></form>}
      {projects.length===0?<div className="portal-empty"><BriefcaseBusiness size={25}/><strong>Aún no hay proyectos asignados.</strong><p>Cuando se cree o asigne un proyecto, aparecerá aquí.</p></div>:<div className="portal-project-layout"><div className="portal-project-list">{projects.map(project=><button type="button" key={project.id} aria-pressed={selected?.id===project.id} className={`portal-project-item ${selected?.id===project.id?'selected':''}`} onClick={()=>setSelectedProject(project.id)}><span className="project-item-top"><strong>{project.name}</strong><small>{project.progress}%</small></span><span className="project-progress"><i style={{width:`${project.progress}%`}}/></span><small>{projectStatuses.find(status=>status.value===project.status)?.label || project.status}</small></button>)}</div>
      {selected&&<article className="portal-project-detail"><div className="portal-project-detail-top"><div><span className="project-status-dot"/>{projectStatuses.find(status=>status.value===selected.status)?.label}</div><div className="portal-top-actions">{staff&&<select aria-label="Estado del proyecto" value={selected.status} onChange={e=>void changeProjectStatus(e.target.value as Project['status'])}>{projectStatuses.map(status=><option key={status.value} value={status.value}>{status.label}</option>)}</select>}{admin&&<button type="button" className="copy-button" disabled={busy} onClick={()=>void deleteProject(selected)}><Trash2 size={15}/> Eliminar</button>}</div></div><h3>{selected.name}</h3><p>{selected.summary||'No se ha añadido un resumen para este proyecto.'}</p><div className="portal-progress-label"><span>Progreso</span><strong>{selected.progress}%</strong></div><div className="portal-progress-large"><i style={{width:`${selected.progress}%`}}/></div>{staff&&<label className="progress-control">Actualizar progreso <input type="range" min="0" max="100" step="5" value={selected.progress} onChange={e=>void changeProgress(Number(e.target.value))}/></label>}<div className="portal-project-dates"><span>Inicio: {selected.start_date?dateLabel(selected.start_date):'Por definir'}</span><span>Objetivo: {selected.target_date?dateLabel(selected.target_date):'Por definir'}</span></div>
        <div className="portal-subsection"><h4>Actualizaciones</h4>{visibleUpdates.length?visibleUpdates.map(update=><article className="portal-update-card" key={update.id}><div><strong>{update.title}</strong><small>{dateLabel(update.created_at)} · {update.visibility==='client'?'Visible para cliente':'Interna'}</small></div><p>{update.body}</p></article>):<p className="portal-muted">Todavía no hay actualizaciones para este proyecto.</p>}</div>
        {staff&&<form className="portal-editor compact" onSubmit={createUpdate}><h4>Publicar actualización</h4><label>Título *<input required maxLength={120} value={updateForm.title} onChange={e=>setUpdateForm(old=>({...old,title:e.target.value}))}/></label><label>Mensaje *<textarea required minLength={3} maxLength={2000} rows={3} value={updateForm.body} onChange={e=>setUpdateForm(old=>({...old,body:e.target.value}))}/></label><label>Visibilidad<select value={updateForm.visibility} onChange={e=>setUpdateForm(old=>({...old,visibility:e.target.value as 'client'|'internal'}))}><option value="client">Visible para el cliente</option><option value="internal">Solo equipo</option></select></label><button className="button button-primary" disabled={busy}><Send size={15}/> Publicar</button></form>}
        <div className="portal-subsection"><h4>Documentos</h4>{visibleDocuments.length?visibleDocuments.map(document=><div className="portal-document" key={document.id}><span><FileText size={17}/><span><strong>{document.file_name}</strong><small>{document.visibility==='client'?'Compartido con cliente':'Interno'} · {dateLabel(document.created_at)}</small></span></span><button className="copy-button" onClick={()=>void openDocument(document)}><ArrowDownToLine size={15}/> Abrir</button></div>):<p className="portal-muted">No hay documentos compartidos.</p>}{staff&&<form className="portal-upload" onSubmit={uploadDocument}><label>Adjuntar documento (máx. 10 MB)<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.zip" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><label>Visibilidad<select value={fileVisibility} onChange={e=>setFileVisibility(e.target.value as 'client'|'internal')}><option value="client">Visible para el cliente</option><option value="internal">Solo equipo</option></select></label><button className="button button-secondary" disabled={!file||busy}><Plus size={15}/> Subir documento</button></form>}</div>
      </article>}</div>}
    </section>}
    {staff&&tab==='leads'&&<section className="portal-section"><div className="portal-section-heading"><div><div className="section-kicker">CRM / ENTRADAS</div><h2>Consultas recibidas</h2></div><button className="copy-button" onClick={()=>void load()}><RefreshCw size={15}/> Actualizar</button></div>{leads.length===0?<div className="portal-empty"><Users size={25}/><strong>No hay consultas registradas.</strong></div>:<div className="portal-leads">{leads.map(lead=><article className="portal-lead-card" key={lead.id}><div className="portal-lead-top"><div><strong>{lead.name}</strong><a href={`mailto:${lead.email}`}>{lead.email}</a></div><small>{dateLabel(lead.created_at)}</small></div><div className="portal-lead-tags"><span>{lead.service}</span>{lead.budget&&<span>{lead.budget}</span>}{lead.organization&&<span>{lead.organization}</span>}</div><p>{lead.details}</p>{lead.features&&<p><strong>Necesidades:</strong> {lead.features}</p>}<div className="portal-lead-bottom"><span>{lead.timing||'Sin plazo indicado'}</span><select aria-label={`Estado de consulta de ${lead.name}`} value={lead.status} disabled={!admin} onChange={e=>void updateLeadStatus(lead,e.target.value as Lead['status'])}>{leadStatuses.map(status=><option key={status.value} value={status.value}>{status.label}</option>)}</select></div></article>)}</div>}</section>}
    {staff&&tab==='updates'&&<section className="portal-section"><div className="portal-section-heading"><div><div className="section-kicker">HISTORIAL</div><h2>Actividad reciente</h2></div></div>{updates.length?updates.map(update=><article className="portal-update-card" key={update.id}><div><strong>{update.title}</strong><small>{projects.find(project=>project.id===update.project_id)?.name||'Proyecto'} · {dateLabel(update.created_at)}</small></div><p>{update.body}</p></article>):<div className="portal-empty"><Activity size={25}/><strong>Sin actualizaciones todavía.</strong></div>}</section>}
    {staff&&admin&&tab==='users'&&<section className="portal-section"><div className="portal-section-heading"><div><div className="section-kicker">ACCESOS / EQUIPO Y CLIENTES</div><h2>Administrar usuarios</h2></div></div><form className="portal-editor" onSubmit={inviteUser}><h4>Invitar una cuenta</h4><div className="form-row"><label>Nombre *<input required minLength={2} maxLength={100} value={inviteForm.displayName} onChange={e=>setInviteForm(old=>({...old,displayName:e.target.value}))}/></label><label>Correo electrónico *<input required type="email" maxLength={160} value={inviteForm.email} onChange={e=>setInviteForm(old=>({...old,email:e.target.value}))}/></label></div><label>Rol inicial<select value={inviteForm.role} onChange={e=>setInviteForm(old=>({...old,role:e.target.value as 'client'|'team'|'admin'}))}><option value="client">Cliente</option><option value="team">Equipo</option>{role==='owner'&&<option value="admin">Administrador</option>}</select></label><button className="button button-primary" disabled={inviteBusy}><Send size={15}/>{inviteBusy?'Enviando invitación…':'Enviar invitación'}</button><p className="portal-muted">La persona recibirá un correo para establecer su contraseña. Los roles de propietario no se asignan desde esta interfaz.</p></form><div className="portal-user-list">{profiles.map(profile=><article className="portal-user-row" key={profile.id}><div><strong>{profile.display_name||'Usuario sin nombre'}</strong><small>{profile.email || profile.id}</small></div><div className="portal-top-actions"><select aria-label={`Rol de ${profile.display_name||profile.id}`} value={profile.role} disabled={profile.id===user?.id || profile.role==='owner' || (profile.role==='admin' && role!=='owner')} onChange={e=>void changeUserRole(profile,e.target.value as 'client'|'team'|'admin')}><option value="client">Cliente</option><option value="team">Equipo</option>{role==='owner'&&<option value="admin">Administrador</option>}{profile.role==='owner'&&<option value="owner">Propietario</option>}</select>{profile.id!==user?.id && profile.role!=='owner' && (role==='owner' || profile.role==='client' || profile.role==='team') && <button type="button" className="copy-button" disabled={inviteBusy} onClick={()=>void deleteUser(profile)}><Trash2 size={14}/> Eliminar</button>}</div></article>)}</div></section>}
    <div className="portal-bottom-note"><ShieldCheck size={16}/> El acceso a consultas, proyectos y documentos se controla mediante políticas de seguridad en la base de datos. <Link to="/privacidad">Privacidad</Link></div>
  </main><SiteFooter/></>
}
