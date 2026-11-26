import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Activity, ArrowLeft, BadgeDollarSign, BriefcaseBusiness, Check, CircleAlert, ClipboardList, ContactRound, FileText, FolderPlus, Plus, Printer, RefreshCw, Search, ShieldCheck, Trash2, Users } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { SiteFooter, SiteHeader } from '../components/SiteShell'
import { useAuth } from '../auth/AuthProvider'
import { isAdminRole, isStaffRole, supabase } from '../lib/supabase'
import './crm-page.css'

type Contact = { id:string; contact_type:'company'|'small_business'|'individual'; display_name:string; organization_name:string|null; email:string|null; phone:string|null; address:string|null; tax_id:string|null; city:string|null; country:string|null; notes:string|null; created_at:string }
type Lead = { id:string; name:string; email:string; organization:string|null; service:string; budget:string|null; timing:string|null; details:string; features:string|null; status:string; contact_id:string|null; created_at:string }
type Opportunity = { id:string; contact_id:string; title:string; description:string|null; stage:string; estimated_value:number|null; currency:string; probability:number; expected_close_date:string|null; project_id:string|null; created_at:string }
type PortalProfile = { id:string; email:string; display_name:string; role:string }
type Task = { id:string; contact_id:string|null; opportunity_id:string|null; title:string; priority:string; status:string; due_at:string|null; assigned_to:string|null }
type ActivityRow = { id:string; contact_id:string|null; opportunity_id:string|null; activity_type:string; subject:string; body:string|null; occurred_at:string }
type Service = { id:string; code:string; name:string; min_price:number|null; max_price:number|null; currency:string; pricing_note:string|null; active:boolean }
type Quote = { id:string; quote_number:number; contact_id:string; opportunity_id:string|null; status:string; currency:string; subtotal:number; discount:number; total:number; valid_until:string|null; notes:string|null; created_at:string }
type QuoteItem = { id:string; quote_id:string; service_id:string|null; description:string; quantity:number; unit_price:number; line_total:number; sort_order:number }
type QuoteDraftItem = { description:string; quantity:string; unit_price:string }

const tabs = [
  {id:'overview',label:'Resumen',icon:BriefcaseBusiness},
  {id:'leads',label:'Consultas',icon:Users},
  {id:'contacts',label:'Contactos',icon:ContactRound},
  {id:'opportunities',label:'Oportunidades',icon:BadgeDollarSign},
  {id:'tasks',label:'Tareas',icon:ClipboardList},
  {id:'activities',label:'Actividad',icon:Activity},
  {id:'quotes',label:'Presupuestos',icon:FileText},
  {id:'services',label:'Servicios y precios',icon:ShieldCheck},
] as const
type Tab = typeof tabs[number]['id']
const stages = [{value:'new',label:'Nueva'},{value:'contacted',label:'Contactado'},{value:'qualified',label:'Calificada'},{value:'proposal',label:'Propuesta'},{value:'negotiation',label:'Negociación'},{value:'won',label:'Ganada'},{value:'lost',label:'Perdida'}]
const taskStates = [{value:'pending',label:'Pendiente'},{value:'in_progress',label:'En curso'},{value:'completed',label:'Completada'},{value:'cancelled',label:'Cancelada'}]
const money = (value:number|null|undefined,currency='USD') => value==null?'Por definir':new Intl.NumberFormat('es',{style:'currency',currency,maximumFractionDigits:2}).format(Number(value))
const dateText = (value:string|null|undefined) => value ? new Intl.DateTimeFormat('es',{dateStyle:'medium'}).format(new Date(value)) : 'Sin fecha'

export default function CRMPage() {
  const {user,role,loading,configured} = useAuth()
  const staff = isStaffRole(role)
  const admin = isAdminRole(role)
  const owner = role === 'owner'
  const [tab,setTab] = useState<Tab>('overview')
  const [contacts,setContacts] = useState<Contact[]>([])
  const [portalProfiles,setPortalProfiles] = useState<PortalProfile[]>([])
  const [leads,setLeads] = useState<Lead[]>([])
  const [opportunities,setOpportunities] = useState<Opportunity[]>([])
  const [tasks,setTasks] = useState<Task[]>([])
  const [activities,setActivities] = useState<ActivityRow[]>([])
  const [services,setServices] = useState<Service[]>([])
  const [quotes,setQuotes] = useState<Quote[]>([])
  const [quoteItems,setQuoteItems] = useState<QuoteItem[]>([])
  const [printingQuoteId,setPrintingQuoteId] = useState<string|null>(null)
  const [search,setSearch] = useState('')
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const [showForm,setShowForm] = useState(false)
  const [editingContactId,setEditingContactId] = useState<string|null>(null)
  const [contactForm,setContactForm] = useState({contact_type:'individual' as Contact['contact_type'],display_name:'',organization_name:'',email:'',phone:'',address:'',tax_id:'',city:'',country:'',notes:''})
  const [opportunityForm,setOpportunityForm] = useState({contact_id:'',title:'',estimated_value:'',currency:'USD',probability:'20',expected_close_date:''})
  const [taskForm,setTaskForm] = useState({contact_id:'',title:'',priority:'normal',due_at:'',description:''})
  const [activityForm,setActivityForm] = useState({contact_id:'',activity_type:'note',subject:'',body:''})
  const [serviceForm,setServiceForm] = useState({code:'',name:'',min_price:'',max_price:'',pricing_note:''})
  const [editingServiceId,setEditingServiceId] = useState<string|null>(null)
  const [quoteForm,setQuoteForm] = useState({contact_id:'',opportunity_id:'',items:[{description:'',quantity:'1',unit_price:''}] as QuoteDraftItem[],discount:'0',valid_until:'',notes:''})

  const load = useCallback(async () => {
    if (!supabase || !user || !staff) return
    setBusy(true); setError('')
    const db = supabase as any
    try {
      const results = await Promise.all([
        db.from('crm_contacts').select('*').order('created_at',{ascending:false}).limit(500),
        db.from('crm_opportunities').select('*').order('created_at',{ascending:false}).limit(500),
        db.from('crm_tasks').select('*').order('created_at',{ascending:false}).limit(500),
        db.from('crm_activities').select('*').order('occurred_at',{ascending:false}).limit(500),
        db.from('crm_service_catalog').select('*').order('sort_order').order('name'),
        db.from('crm_quotes').select('*').order('created_at',{ascending:false}).limit(500),
        db.from('leads').select('*').order('created_at',{ascending:false}).limit(500),
        db.from('profiles').select('id,email,display_name,role').order('display_name'),
        db.from('crm_quote_items').select('*').order('sort_order'),
      ])
      const failed = results.find((r:any)=>r.error)
      if (failed?.error) throw failed.error
      setContacts(results[0].data||[]); setOpportunities(results[1].data||[]); setTasks(results[2].data||[])
      setActivities(results[3].data||[]); setServices(results[4].data||[]); setQuotes(results[5].data||[]); setLeads(results[6].data||[]); setPortalProfiles(results[7].data||[]); setQuoteItems(results[8].data||[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el CRM. Comprueba la conexión y los permisos.')
    } finally { setBusy(false) }
  },[user,staff])

  useEffect(()=>{ if(!loading && staff) void load() },[loading,staff,load])

  useEffect(()=>{
    if(!printingQuoteId)return
    const finishPrint=()=>setPrintingQuoteId(null)
    window.addEventListener('afterprint',finishPrint,{once:true})
    window.print()
    return ()=>window.removeEventListener('afterprint',finishPrint)
  },[printingQuoteId])

  const filteredContacts = useMemo(()=>contacts.filter(c=>[c.display_name,c.organization_name,c.email,c.phone,c.city].join(' ').toLowerCase().includes(search.toLowerCase())),[contacts,search])
  const contactName = (id:string|null) => contacts.find(c=>c.id===id)?.display_name || 'Contacto'
  const openTasks = tasks.filter(t=>t.status==='pending'||t.status==='in_progress')
  const won = opportunities.filter(o=>o.stage==='won')
  const formatOpportunityTotal = (rows:Opportunity[]) => {
    const totals = new Map<string,number>()
    rows.forEach(row=>{if(row.estimated_value!=null)totals.set(row.currency,(totals.get(row.currency)||0)+Number(row.estimated_value))})
    return [...totals.entries()].map(([currency,total])=>money(total,currency)).join(' · ') || 'Por definir'
  }
  const pipeline = formatOpportunityTotal(opportunities.filter(o=>!['won','lost'].includes(o.stage)))

  async function finish(message:string) { setNotice(message); setError(''); setShowForm(false); await load() }
  async function createContact(e:FormEvent) {
    e.preventDefault(); if(!supabase||!user||!admin)return
    setBusy(true)
    const values={...contactForm,organization_name:contactForm.organization_name.trim()||null,email:contactForm.email.trim()||null,phone:contactForm.phone.trim()||null,address:contactForm.address.trim()||null,tax_id:contactForm.tax_id.trim()||null,city:contactForm.city.trim()||null,country:contactForm.country.trim()||null,notes:contactForm.notes.trim()||null}
    const db=(supabase as any).from('crm_contacts')
    const {error:e1}=editingContactId?await db.update(values).eq('id',editingContactId):await db.insert({...values,created_by:user.id})
    setBusy(false); if(e1){setError(e1.message);return}
    setContactForm({contact_type:'individual',display_name:'',organization_name:'',email:'',phone:'',address:'',tax_id:'',city:'',country:'',notes:''});setEditingContactId(null)
    await finish(editingContactId?'Contacto actualizado correctamente.':'Contacto creado correctamente.')
  }
  async function convertLeadToContact(lead:Lead) {
    if(!supabase||!user||!admin||lead.contact_id)return
    setBusy(true);setError('')
    const db=supabase as any
    const {data,error:e1}=await db.from('crm_contacts').insert({
      contact_type:lead.organization?'small_business':'individual',
      display_name:lead.name,
      organization_name:lead.organization||null,
      email:lead.email,
      source:'quote_form',
      notes:[`Servicio solicitado: ${lead.service}`,lead.budget?`Presupuesto orientativo: ${lead.budget}`:null,lead.timing?`Plazo: ${lead.timing}`:null,lead.details,lead.features?`Necesidades: ${lead.features}`:null].filter(Boolean).join('\n\n'),
      created_by:user.id,
    }).select('id').single()
    if(e1){setBusy(false);setError(e1.message);return}
    const {error:e2}=await db.from('leads').update({contact_id:data.id}).eq('id',lead.id)
    setBusy(false)
    if(e2){await db.from('crm_contacts').delete().eq('id',data.id);setError('No se pudo vincular la consulta. Se revirtió el contacto creado: '+e2.message);await load();return}
    await finish('Consulta convertida en contacto y vinculada al CRM.')
  }
  async function createOpportunity(e:FormEvent) {
    e.preventDefault(); if(!supabase||!user||!admin)return
    setBusy(true)
    const {error:e1}=await (supabase as any).from('crm_opportunities').insert({contact_id:opportunityForm.contact_id,title:opportunityForm.title,estimated_value:opportunityForm.estimated_value===''?null:Number(opportunityForm.estimated_value),currency:opportunityForm.currency,probability:Number(opportunityForm.probability),expected_close_date:opportunityForm.expected_close_date||null,created_by:user.id})
    setBusy(false); if(e1){setError(e1.message);return}
    setOpportunityForm({contact_id:'',title:'',estimated_value:'',currency:'USD',probability:'20',expected_close_date:''})
    await finish('Oportunidad registrada.')
  }
  async function createProjectFromOpportunity(opportunity:Opportunity) {
    if(!supabase||!user||!admin||opportunity.stage!=='won'||opportunity.project_id)return
    const contact=contacts.find(item=>item.id===opportunity.contact_id)
    if(!contact){setError('No se encontró el contacto asociado a esta oportunidad.');return}
    setBusy(true);setError('');setNotice('')
    const matchingClient=contact.email
      ? portalProfiles.find(profile=>profile.role==='client'&&profile.email.trim().toLowerCase()===contact.email?.trim().toLowerCase())
      : undefined
    const summary=[
      'Proyecto creado desde el CRM.',
      `Oportunidad: ${opportunity.title}`,
      `Contacto: ${contact.display_name}`,
      contact.email? `Correo: ${contact.email}`:null,
      opportunity.description?.trim()||null,
      opportunity.estimated_value!=null?`Valor comercial de referencia: ${money(opportunity.estimated_value,opportunity.currency)}`:null,
    ].filter(Boolean).join('\n\n')
    const db=supabase as any
    const {data:project,error:createError}=await db.from('projects').insert({
      name:opportunity.title.trim().slice(0,120),
      summary,
      client_id:matchingClient?.id||null,
      status:'planning',
      progress:0,
    }).select('id').single()
    if(createError){setBusy(false);setError('No se pudo crear el proyecto: '+createError.message);return}
    const {error:linkError}=await db.from('crm_opportunities').update({project_id:project.id}).eq('id',opportunity.id).is('project_id',null)
    if(linkError){
      const {error:rollbackError}=await db.from('projects').delete().eq('id',project.id)
      setBusy(false)
      setError('El proyecto se creó, pero no pudo vincularse a la oportunidad. '+(rollbackError?'No se pudo revertir automáticamente, revisa el panel de proyectos.':'Se revirtió la creación para evitar duplicados.')+' Detalle: '+linkError.message)
      await load()
      return
    }
    const {error:activityError}=await db.from('crm_activities').insert({
      contact_id:contact.id,
      opportunity_id:opportunity.id,
      project_id:project.id,
      activity_type:'status_change',
      subject:'Proyecto creado desde oportunidad ganada',
      body:matchingClient
        ? `Proyecto vinculado a la cuenta del portal de ${matchingClient.display_name||matchingClient.email}.`
        : 'El proyecto quedó sin cuenta de cliente vinculada. Para habilitar el portal, invita al cliente con el mismo correo registrado en el contacto.',
      created_by:user.id,
    })
    setBusy(false)
    await finish(activityError
      ? 'Proyecto creado y vinculado a la oportunidad. No se pudo añadir la nota automática al historial.'
      : matchingClient
        ? 'Proyecto creado, vinculado a la oportunidad y asignado a la cuenta del cliente.'
        : 'Proyecto creado y vinculado a la oportunidad. No existe una cuenta de portal con ese correo, por lo que quedó sin asignar.')
  }

  async function createTask(e:FormEvent) {
    e.preventDefault(); if(!supabase||!user||!admin)return
    setBusy(true)
    const {error:e1}=await (supabase as any).from('crm_tasks').insert({contact_id:taskForm.contact_id,title:taskForm.title,priority:taskForm.priority,due_at:taskForm.due_at?new Date(taskForm.due_at).toISOString():null,description:taskForm.description||null,assigned_to:user.id,created_by:user.id})
    setBusy(false); if(e1){setError(e1.message);return}
    setTaskForm({contact_id:'',title:'',priority:'normal',due_at:'',description:''})
    await finish('Tarea creada y asignada.')
  }
  async function createActivity(e:FormEvent) {
    e.preventDefault(); if(!supabase||!user||!admin)return
    setBusy(true)
    const {error:e1}=await (supabase as any).from('crm_activities').insert({contact_id:activityForm.contact_id,activity_type:activityForm.activity_type,subject:activityForm.subject,body:activityForm.body||null,created_by:user.id})
    setBusy(false); if(e1){setError(e1.message);return}
    setActivityForm({contact_id:'',activity_type:'note',subject:'',body:''})
    await finish('Actividad añadida al historial.')
  }
  async function createService(e:FormEvent) {
    e.preventDefault(); if(!supabase||!owner)return
    setBusy(true)
    const values={code:serviceForm.code.trim().toLowerCase().replace(/\s+/g,'-'),name:serviceForm.name,min_price:serviceForm.min_price===''?null:Number(serviceForm.min_price),max_price:serviceForm.max_price===''?null:Number(serviceForm.max_price),pricing_note:serviceForm.pricing_note||null}
    const query=(supabase as any).from('crm_service_catalog')
    const {error:e1}=editingServiceId?await query.update(values).eq('id',editingServiceId):await query.insert(values)
    setBusy(false); if(e1){setError(e1.message);return}
    setServiceForm({code:'',name:'',min_price:'',max_price:'',pricing_note:''});setEditingServiceId(null)
    await finish(editingServiceId?'Servicio actualizado.':'Servicio añadido al catálogo.')
  }
  async function createQuote(e:FormEvent) {
    e.preventDefault(); if(!supabase||!user||!admin)return
    const items=quoteForm.items.map(item=>({description:item.description.trim(),quantity:Number(item.quantity),unit_price:Number(item.unit_price)}))
    if(!items.length||items.some(item=>!item.description||item.description.length>240||!Number.isFinite(item.quantity)||item.quantity<=0||!Number.isFinite(item.unit_price)||item.unit_price<0)){
      setError('Añade al menos una partida y revisa su descripción, cantidad y precio.');return
    }
    const subtotal=Number(items.reduce((sum,item)=>sum+item.quantity*item.unit_price,0).toFixed(2))
    const discount=Number(quoteForm.discount||0)
    if(!Number.isFinite(discount)||discount<0||discount>subtotal){setError('El descuento debe estar entre 0 y el subtotal.');return}
    const total=Number((subtotal-discount).toFixed(2))
    setBusy(true);setError('')
    const db=supabase as any
    const {data,error:e1}=await db.from('crm_quotes').insert({contact_id:quoteForm.contact_id,opportunity_id:quoteForm.opportunity_id||null,currency:'USD',subtotal,discount,total,valid_until:quoteForm.valid_until||null,notes:quoteForm.notes.trim()||null,created_by:user.id}).select('id').single()
    if(e1){setBusy(false);setError(e1.message);return}
    const {error:e2}=await db.from('crm_quote_items').insert(items.map((item,index)=>({...item,quote_id:data.id,sort_order:(index+1)*10})))
    if(e2){const {error:rollbackError}=await db.from('crm_quotes').delete().eq('id',data.id);setBusy(false);setError('No se pudieron guardar las partidas. '+(rollbackError?'El borrador quedó creado y requiere revisión manual.':'Se revirtió el borrador para evitar un presupuesto incompleto.')+' Detalle: '+e2.message);return}
    setBusy(false);setQuoteForm({contact_id:'',opportunity_id:'',items:[{description:'',quantity:'1',unit_price:''}],discount:'0',valid_until:'',notes:''})
    await finish('Presupuesto creado como borrador con '+items.length+' partida(s).')
  }
  async function updateRow(table:string,id:string,values:Record<string,unknown>,message:string) {
    if(!supabase||!admin)return
    setBusy(true); const {error:e1}=await (supabase as any).from(table).update(values).eq('id',id)
    setBusy(false); if(e1){setError(e1.message);return} await finish(message)
  }

  if(loading)return <><SiteHeader/><main className="crm-shell"><p>Comprobando acceso…</p></main><SiteFooter/></>
  if(!configured||!user)return <Navigate to="/acceso" replace/>
  if(!staff)return <Navigate to="/panel" replace/>

  return <><SiteHeader/><main id="contenido" className="crm-shell">
    <div className="crm-topline"><Link to="/panel" className="crm-back"><ArrowLeft size={15}/> Volver al espacio privado</Link><span><ShieldCheck size={15}/> Área interna de Codexia</span></div>
    <div className="crm-heading"><div><div className="section-kicker">CODEXIA SYSTEMS / GESTIÓN COMERCIAL</div><h1>CRM <em>central.</em></h1><p>Contactos, oportunidades, seguimiento, presupuestos y catálogo de servicios en un solo lugar.</p></div><button className="crm-button secondary" onClick={()=>void load()} disabled={busy}><RefreshCw size={16}/> Actualizar</button></div>
    <div className="crm-role-note"><ShieldCheck size={16}/><span>Sesión: <strong>{role==='owner'?'Propietario':role==='admin'?'Administrador':'Equipo'}</strong>. {owner?'Control total del catálogo y la configuración comercial.':admin?'Gestión comercial y operativa.':'Acceso de consulta.'}</span></div>
    <nav className="crm-tabs" aria-label="Secciones del CRM">{tabs.map(({id,label,icon:Icon})=><button key={id} className={tab===id?'active':''} onClick={()=>{setTab(id);setShowForm(false);setError('');setNotice('')}}><Icon size={16}/>{label}</button>)}</nav>
    {error&&<div className="crm-alert error"><CircleAlert size={17}/>{error}</div>}
    {notice&&<div className="crm-alert success"><Check size={17}/>{notice}</div>}
    {tab==='overview'&&<section className="crm-content">
      <div className="crm-metrics"><article><span>Contactos</span><strong>{contacts.length}</strong><small>Personas y organizaciones</small></article><article><span>Oportunidades abiertas</span><strong>{opportunities.filter(o=>!['won','lost'].includes(o.stage)).length}</strong><small>Pipeline: {pipeline}</small></article><article><span>Tareas pendientes</span><strong>{openTasks.length}</strong><small>Por completar</small></article><article><span>Ventas ganadas</span><strong>{won.length}</strong><small>Valor: {formatOpportunityTotal(won)}</small></article></div>
      <div className="crm-overview-grid"><section className="crm-panel"><div className="crm-panel-head"><h2>Oportunidades recientes</h2><button onClick={()=>setTab('opportunities')}>Ver todas</button></div>{opportunities.slice(0,5).map(o=><div className="crm-list-row" key={o.id}><div><strong>{o.title}</strong><small>{contactName(o.contact_id)}</small></div><span className={'crm-stage '+o.stage}>{stages.find(s=>s.value===o.stage)?.label||o.stage}</span><b>{money(o.estimated_value,o.currency)}</b></div>)}{!opportunities.length&&<p className="crm-empty">Todavía no hay oportunidades registradas.</p>}</section>
      <section className="crm-panel"><div className="crm-panel-head"><h2>Próximas tareas</h2><button onClick={()=>setTab('tasks')}>Ver todas</button></div>{openTasks.slice(0,6).map(t=><div className="crm-task-row" key={t.id}><span className={'crm-priority '+t.priority}/><div><strong>{t.title}</strong><small>{contactName(t.contact_id)} · {dateText(t.due_at)}</small></div><span className="crm-muted">{taskStates.find(s=>s.value===t.status)?.label}</span></div>)}{!openTasks.length&&<p className="crm-empty">No hay tareas pendientes. Buen momento para planificar.</p>}</section></div>
      <section className="crm-panel"><div className="crm-panel-head"><h2>Acciones rápidas</h2></div><div className="crm-quick-actions"><button onClick={()=>{setTab('contacts');setShowForm(true)}}><Users/>Nuevo contacto</button><button onClick={()=>{setTab('opportunities');setShowForm(true)}}><BadgeDollarSign/>Nueva oportunidad</button><button onClick={()=>{setTab('tasks');setShowForm(true)}}><ClipboardList/>Crear tarea</button><button onClick={()=>{setTab('quotes');setShowForm(true)}}><FileText/>Nuevo presupuesto</button></div></section>
    </section>}
    {tab==='leads'&&<section className="crm-content"><div className="crm-section-head"><div><h2>Consultas recibidas</h2><p>Solicitudes del formulario público. Convierte una consulta en contacto para continuar su seguimiento.</p></div><span className="crm-muted">{leads.length} registradas</span></div><div className="crm-card-list">{leads.map(lead=><article className="crm-record-card" key={lead.id}><div className="crm-record-main"><span className="crm-record-kicker">{lead.service} · {dateText(lead.created_at)}</span><h3>{lead.name}</h3><p>{lead.email}{lead.organization?' · '+lead.organization:''}{lead.budget?' · '+lead.budget:''}</p><p>{lead.details}</p></div><div className="crm-record-controls">{lead.contact_id?<span className="crm-stage won">Vinculada: {contactName(lead.contact_id)}</span>:admin?<button className="crm-button primary" disabled={busy} onClick={()=>void convertLeadToContact(lead)}>Convertir en contacto</button>:<span className="crm-muted">Sin convertir</span>}</div></article>)}{!leads.length&&<p className="crm-empty">No hay consultas recibidas todavía.</p>}</div></section>}
      {tab==='contacts'&&<section className="crm-content"><div className="crm-section-head"><div><h2>Contactos</h2><p>Empresas, pequeños negocios y personas individuales tienen el mismo acceso al proceso comercial.</p></div><div className="crm-head-actions"><label className="crm-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar contacto…"/></label>{admin&&<button className="crm-button primary" onClick={()=>setShowForm(v=>!v)}><Plus size={16}/> Nuevo contacto</button>}</div></div>
      {showForm&&admin&&<form className="crm-form" onSubmit={createContact}><h3>{editingContactId?'Editar contacto':'Registrar contacto'}</h3><div className="crm-form-grid"><label>Tipo de contacto<select value={contactForm.contact_type} onChange={e=>setContactForm(v=>({...v,contact_type:e.target.value as Contact['contact_type']}))}><option value="individual">Persona individual</option><option value="small_business">Pequeño negocio / emprendimiento</option><option value="company">Empresa</option></select></label><label>Nombre o razón social *<input required minLength={2} maxLength={160} value={contactForm.display_name} onChange={e=>setContactForm(v=>({...v,display_name:e.target.value}))}/></label><label>Nombre del negocio (opcional)<input value={contactForm.organization_name} onChange={e=>setContactForm(v=>({...v,organization_name:e.target.value}))}/></label><label>Correo<input type="email" value={contactForm.email} onChange={e=>setContactForm(v=>({...v,email:e.target.value}))}/></label><label>Teléfono<input value={contactForm.phone} onChange={e=>setContactForm(v=>({...v,phone:e.target.value}))}/></label><label>Identificador fiscal (opcional)<input value={contactForm.tax_id} onChange={e=>setContactForm(v=>({...v,tax_id:e.target.value}))}/></label><label>Dirección (opcional)<input value={contactForm.address} onChange={e=>setContactForm(v=>({...v,address:e.target.value}))}/></label><label>Ciudad<input value={contactForm.city} onChange={e=>setContactForm(v=>({...v,city:e.target.value}))}/></label><label>País<input value={contactForm.country} onChange={e=>setContactForm(v=>({...v,country:e.target.value}))}/></label><label className="wide">Notas<textarea rows={2} value={contactForm.notes} onChange={e=>setContactForm(v=>({...v,notes:e.target.value}))}/></label></div><div className="crm-form-actions"><button className="crm-button primary" disabled={busy}>{editingContactId?"Guardar cambios":"Guardar contacto"}</button><button type="button" className="crm-button secondary" onClick={()=>{setShowForm(false);setEditingContactId(null);setContactForm({contact_type:"individual",display_name:"",organization_name:"",email:"",phone:"",address:"",tax_id:"",city:"",country:"",notes:""})}}>Cancelar</button></div></form>}
      <div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>Contacto</th><th>Tipo</th><th>Correo / teléfono</th><th>Ubicación</th><th>Registro</th>{admin&&<th>Acciones</th>}</tr></thead><tbody>{filteredContacts.map(c=><tr key={c.id}><td><strong>{c.display_name}</strong>{c.organization_name&&<small>{c.organization_name}</small>}</td><td>{c.contact_type==='individual'?'Persona':c.contact_type==='small_business'?'Pequeño negocio':'Empresa'}</td><td>{c.email||'Sin correo'}<small>{c.phone||'Sin teléfono'}</small></td><td>{[c.city,c.country].filter(Boolean).join(', ')||'No indicada'}</td><td>{dateText(c.created_at)}</td>{admin&&<td><button className="crm-button secondary small" onClick={()=>{setEditingContactId(c.id);setContactForm({contact_type:c.contact_type,display_name:c.display_name,organization_name:c.organization_name||"",email:c.email||"",phone:c.phone||"",address:c.address||"",tax_id:c.tax_id||"",city:c.city||"",country:c.country||"",notes:c.notes||""});setShowForm(true)}}>Editar</button></td>}</tr>)}</tbody></table>{!filteredContacts.length&&<p className="crm-empty">No hay contactos que coincidan con la búsqueda.</p>}</div>
    </section>}
    {tab==='opportunities'&&<section className="crm-content"><div className="crm-section-head"><div><h2>Oportunidades</h2><p>Da seguimiento al ciclo comercial. Al ganar una oportunidad puedes crear su proyecto y vincularlo a una cuenta del portal usando el correo del contacto.</p></div>{admin&&<button className="crm-button primary" onClick={()=>setShowForm(v=>!v)}><Plus size={16}/> Nueva oportunidad</button>}</div>
      {showForm&&admin&&<form className="crm-form" onSubmit={createOpportunity}><h3>Registrar oportunidad</h3><div className="crm-form-grid"><label>Contacto *<select required value={opportunityForm.contact_id} onChange={e=>setOpportunityForm(v=>({...v,contact_id:e.target.value}))}><option value="">Seleccionar</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.display_name}</option>)}</select></label><label>Nombre de la oportunidad *<input required minLength={2} value={opportunityForm.title} onChange={e=>setOpportunityForm(v=>({...v,title:e.target.value}))}/></label><label>Valor estimado<input type="number" min="0" step="0.01" value={opportunityForm.estimated_value} onChange={e=>setOpportunityForm(v=>({...v,estimated_value:e.target.value}))}/></label><label>Moneda<select value={opportunityForm.currency} onChange={e=>setOpportunityForm(v=>({...v,currency:e.target.value}))}><option>USD</option><option>EUR</option><option>CUP</option></select></label><label>Probabilidad (%)<input type="number" min="0" max="100" value={opportunityForm.probability} onChange={e=>setOpportunityForm(v=>({...v,probability:e.target.value}))}/></label><label>Fecha estimada de cierre<input type="date" value={opportunityForm.expected_close_date} onChange={e=>setOpportunityForm(v=>({...v,expected_close_date:e.target.value}))}/></label></div><div className="crm-form-actions"><button className="crm-button primary" disabled={busy||!contacts.length}>Guardar oportunidad</button><button type="button" className="crm-button secondary" onClick={()=>setShowForm(false)}>Cancelar</button></div>{!contacts.length&&<small>Primero registra un contacto.</small>}</form>}
      <div className="crm-card-list">{opportunities.map(o=><article className="crm-record-card" key={o.id}><div className="crm-record-main"><span className="crm-record-kicker">{contactName(o.contact_id)}</span><h3>{o.title}</h3><p>{money(o.estimated_value,o.currency)} · Probabilidad {o.probability}% · Cierre: {dateText(o.expected_close_date)}</p></div><div className="crm-record-controls"><strong>{money(o.estimated_value,o.currency)}</strong>{admin?<select aria-label={'Estado de '+o.title} value={o.stage} disabled={busy} onChange={e=>void updateRow('crm_opportunities',o.id,{stage:e.target.value},'Estado de oportunidad actualizado.')}>{stages.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select>:<span className={'crm-stage '+o.stage}>{stages.find(s=>s.value===o.stage)?.label}</span>}{o.project_id?<><span className="crm-stage won">Proyecto vinculado</span><Link className="crm-button secondary small" to="/panel">Ver proyectos</Link></>:admin&&o.stage==='won'?<button type="button" className="crm-button secondary small" disabled={busy} onClick={()=>void createProjectFromOpportunity(o)}><FolderPlus size={14}/> Crear proyecto</button>:null}</div></article>)}{!opportunities.length&&<p className="crm-empty">No hay oportunidades todavía.</p>}</div>
    </section>}
    {tab==='tasks'&&<section className="crm-content"><div className="crm-section-head"><div><h2>Tareas y seguimiento</h2><p>Organiza próximos pasos y asigna responsabilidades.</p></div>{admin&&<button className="crm-button primary" onClick={()=>setShowForm(v=>!v)}><Plus size={16}/> Nueva tarea</button>}</div>
      {showForm&&admin&&<form className="crm-form" onSubmit={createTask}><h3>Crear tarea</h3><div className="crm-form-grid"><label>Contacto *<select required value={taskForm.contact_id} onChange={e=>setTaskForm(v=>({...v,contact_id:e.target.value}))}><option value="">Seleccionar</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.display_name}</option>)}</select></label><label>Tarea *<input required minLength={2} value={taskForm.title} onChange={e=>setTaskForm(v=>({...v,title:e.target.value}))}/></label><label>Prioridad<select value={taskForm.priority} onChange={e=>setTaskForm(v=>({...v,priority:e.target.value}))}><option value="low">Baja</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label><label>Fecha límite<input type="datetime-local" value={taskForm.due_at} onChange={e=>setTaskForm(v=>({...v,due_at:e.target.value}))}/></label><label className="wide">Descripción<textarea rows={2} value={taskForm.description} onChange={e=>setTaskForm(v=>({...v,description:e.target.value}))}/></label></div><div className="crm-form-actions"><button className="crm-button primary" disabled={busy||!contacts.length}>Crear tarea</button><button type="button" className="crm-button secondary" onClick={()=>setShowForm(false)}>Cancelar</button></div></form>}
      <div className="crm-card-list">{tasks.map(t=><article className="crm-record-card" key={t.id}><span className={'crm-priority '+t.priority}/><div className="crm-record-main"><h3>{t.title}</h3><p>{contactName(t.contact_id)} · {t.priority==='urgent'?'Urgente':t.priority==='high'?'Alta':t.priority==='low'?'Baja':'Normal'} · {dateText(t.due_at)}</p></div><div className="crm-record-controls">{admin?<select value={t.status} disabled={busy} onChange={e=>void updateRow('crm_tasks',t.id,{status:e.target.value,completed_at:e.target.value==='completed'?new Date().toISOString():null},'Tarea actualizada.')}>{taskStates.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select>:<span>{taskStates.find(s=>s.value===t.status)?.label}</span>}</div></article>)}{!tasks.length&&<p className="crm-empty">No hay tareas registradas.</p>}</div>
    </section>}
    {tab==='activities'&&<section className="crm-content"><div className="crm-section-head"><div><h2>Historial de actividad</h2><p>Llamadas, correos, reuniones, mensajes y notas.</p></div>{admin&&<button className="crm-button primary" onClick={()=>setShowForm(v=>!v)}><Plus size={16}/> Registrar actividad</button>}</div>
      {showForm&&admin&&<form className="crm-form" onSubmit={createActivity}><h3>Nueva actividad</h3><div className="crm-form-grid"><label>Contacto *<select required value={activityForm.contact_id} onChange={e=>setActivityForm(v=>({...v,contact_id:e.target.value}))}><option value="">Seleccionar</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.display_name}</option>)}</select></label><label>Tipo<select value={activityForm.activity_type} onChange={e=>setActivityForm(v=>({...v,activity_type:e.target.value}))}><option value="note">Nota</option><option value="call">Llamada</option><option value="email">Correo</option><option value="meeting">Reunión</option><option value="message">Mensaje</option><option value="other">Otro</option></select></label><label className="wide">Asunto *<input required value={activityForm.subject} onChange={e=>setActivityForm(v=>({...v,subject:e.target.value}))}/></label><label className="wide">Detalle<textarea rows={3} value={activityForm.body} onChange={e=>setActivityForm(v=>({...v,body:e.target.value}))}/></label></div><div className="crm-form-actions"><button className="crm-button primary" disabled={busy||!contacts.length}>Guardar actividad</button><button type="button" className="crm-button secondary" onClick={()=>setShowForm(false)}>Cancelar</button></div></form>}
      <div className="crm-timeline">{activities.map(a=><article key={a.id}><span className="crm-timeline-dot"/><div><small>{dateText(a.occurred_at)} · {contactName(a.contact_id)}</small><h3>{a.subject}</h3><p>{a.body||a.activity_type}</p></div></article>)}{!activities.length&&<p className="crm-empty">El historial está vacío.</p>}</div>
    </section>}
    {tab==='quotes'&&<section className="crm-content"><div className="crm-section-head"><div><h2>Presupuestos</h2><p>Propuestas comerciales con partidas, descuentos y vigencia.</p></div>{admin&&<button className="crm-button primary" onClick={()=>setShowForm(v=>!v)}><Plus size={16}/> Nuevo presupuesto</button>}</div>
      {showForm&&admin&&<form className="crm-form" onSubmit={createQuote}><h3>Crear presupuesto</h3><div className="crm-form-grid"><label>Contacto *<select required value={quoteForm.contact_id} onChange={e=>setQuoteForm(v=>({...v,contact_id:e.target.value,opportunity_id:''}))}><option value="">Seleccionar</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.display_name}</option>)}</select></label><label>Oportunidad relacionada (opcional)<select value={quoteForm.opportunity_id} onChange={e=>setQuoteForm(v=>({...v,opportunity_id:e.target.value}))}><option value="">Sin asociar</option>{opportunities.filter(o=>o.contact_id===quoteForm.contact_id).map(o=><option key={o.id} value={o.id}>{o.title}</option>)}</select></label></div><div className="crm-quote-editor"><div className="crm-quote-editor-head"><h4>Partidas del presupuesto</h4><button type="button" className="crm-button secondary small" onClick={()=>setQuoteForm(v=>({...v,items:[...v.items,{description:'',quantity:'1',unit_price:''}]}))}><Plus size={14}/> Añadir partida</button></div>{quoteForm.items.map((item,index)=><div className="crm-quote-line" key={index}><label>Concepto / servicio<input required maxLength={240} value={item.description} onChange={e=>setQuoteForm(v=>({...v,items:v.items.map((line,i)=>i===index?{...line,description:e.target.value}:line)}))}/></label><label>Cantidad<input required type="number" min="0.01" step="0.01" value={item.quantity} onChange={e=>setQuoteForm(v=>({...v,items:v.items.map((line,i)=>i===index?{...line,quantity:e.target.value}:line)}))}/></label><label>Precio unitario (USD)<input required type="number" min="0" step="0.01" value={item.unit_price} onChange={e=>setQuoteForm(v=>({...v,items:v.items.map((line,i)=>i===index?{...line,unit_price:e.target.value}:line)}))}/></label><strong>{money((Number(item.quantity)||0)*(Number(item.unit_price)||0),'USD')}</strong>{quoteForm.items.length>1&&<button type="button" className="crm-icon-button" aria-label={'Eliminar partida '+(index+1)} onClick={()=>setQuoteForm(v=>({...v,items:v.items.filter((_,i)=>i!==index)}))}><Trash2 size={16}/></button>}</div>)}</div><div className="crm-form-grid"><label>Descuento global (USD)<input type="number" min="0" step="0.01" value={quoteForm.discount} onChange={e=>setQuoteForm(v=>({...v,discount:e.target.value}))}/></label><label>Válido hasta<input type="date" value={quoteForm.valid_until} onChange={e=>setQuoteForm(v=>({...v,valid_until:e.target.value}))}/></label><label className="wide">Notas / condiciones<textarea rows={3} value={quoteForm.notes} onChange={e=>setQuoteForm(v=>({...v,notes:e.target.value}))}/></label></div><div className="crm-quote-totals"><span>Subtotal: <strong>{money(quoteForm.items.reduce((sum,item)=>sum+(Number(item.quantity)||0)*(Number(item.unit_price)||0),0),'USD')}</strong></span><span>Descuento: <strong>{money(Number(quoteForm.discount)||0,'USD')}</strong></span><span>Total: <strong>{money(Math.max(0,quoteForm.items.reduce((sum,item)=>sum+(Number(item.quantity)||0)*(Number(item.unit_price)||0),0)-(Number(quoteForm.discount)||0)),'USD')}</strong></span></div><div className="crm-form-actions"><button className="crm-button primary" disabled={busy||!contacts.length}>Guardar borrador</button><button type="button" className="crm-button secondary" onClick={()=>setShowForm(false)}>Cancelar</button></div></form>}
      <div className="crm-card-list">{quotes.map(q=><article className="crm-record-card" key={q.id}><div className="crm-record-main"><span className="crm-record-kicker">Presupuesto #{q.quote_number}</span><h3>{contactName(q.contact_id)}</h3><p>{q.opportunity_id?'Oportunidad: '+(opportunities.find(o=>o.id===q.opportunity_id)?.title||'Asociada')+' · ':''}Creado: {dateText(q.created_at)} · {q.valid_until?'Válido hasta '+dateText(q.valid_until):'Sin vencimiento definido'}</p><small>{quoteItems.filter(item=>item.quote_id===q.id).length} partida(s)</small></div><div className="crm-record-controls"><strong>{money(q.total,q.currency)}</strong>{admin?<select value={q.status} disabled={busy} onChange={e=>void updateRow('crm_quotes',q.id,{status:e.target.value},'Estado del presupuesto actualizado.')}><option value="draft">Borrador</option><option value="sent">Enviado</option><option value="accepted">Aceptado</option><option value="rejected">Rechazado</option><option value="expired">Vencido</option><option value="cancelled">Cancelado</option></select>:<span>{q.status}</span>}<button type="button" className="crm-button secondary small" onClick={()=>setPrintingQuoteId(q.id)}><Printer size={14}/> PDF / Imprimir</button></div></article>)}{!quotes.length&&<p className="crm-empty">No hay presupuestos creados.</p></div>
      {printingQuoteId&&(()=>{const q=quotes.find(item=>item.id===printingQuoteId);if(!q)return null;const lines=quoteItems.filter(item=>item.quote_id===q.id);const contact=contacts.find(item=>item.id===q.contact_id);const opportunity=opportunities.find(item=>item.id===q.opportunity_id);return <section className="crm-print-sheet"><header><div><strong>CODEXIA SYSTEMS</strong><p>Transformamos Procesos en Soluciones</p></div><div><h1>Presupuesto #{q.quote_number}</h1><p>Fecha: {dateText(q.created_at)}</p></div></header><h2>{contact?.display_name||'Cliente'}</h2>{contact?.email&&<p>{contact.email}</p>}{contact?.phone&&<p>{contact.phone}</p>}{opportunity&&<p>Oportunidad: {opportunity.title}</p>}<table><thead><tr><th>Concepto</th><th>Cantidad</th><th>Precio unitario</th><th>Importe</th></tr></thead><tbody>{lines.map(line=><tr key={line.id}><td>{line.description}</td><td>{line.quantity}</td><td>{money(line.unit_price,q.currency)}</td><td>{money(line.line_total,q.currency)}</td></tr>)}</tbody></table><div className="crm-print-totals"><p>Subtotal: {money(q.subtotal,q.currency)}</p><p>Descuento: {money(q.discount,q.currency)}</p><h2>Total: {money(q.total,q.currency)}</h2></div>{q.valid_until&&<p>Válido hasta: {dateText(q.valid_until)}</p>}{q.notes&&<div><h3>Notas y condiciones</h3><p>{q.notes}</p></div>}<footer>Codexia Systems · Todos los derechos reservados.</footer></section>})()}
    </section>}
    {tab==='services'&&<section className="crm-content"><div className="crm-section-head"><div><h2>Catálogo de servicios y precios</h2><p>Precios de referencia editables por el propietario. Cada propuesta se ajusta al alcance real.</p></div></div>
      {owner&&<form className="crm-form" onSubmit={createService}><h3>{editingServiceId?"Editar servicio":"Añadir servicio"}</h3><div className="crm-form-grid"><label>Código único *<input required readOnly={!!editingServiceId} value={serviceForm.code} onChange={e=>setServiceForm(v=>({...v,code:e.target.value}))} placeholder="web-landing"/></label><label>Nombre *<input required value={serviceForm.name} onChange={e=>setServiceForm(v=>({...v,name:e.target.value}))}/></label><label>Precio mínimo (USD)<input type="number" min="0" step="0.01" value={serviceForm.min_price} onChange={e=>setServiceForm(v=>({...v,min_price:e.target.value}))}/></label><label>Precio máximo (USD)<input type="number" min="0" step="0.01" value={serviceForm.max_price} onChange={e=>setServiceForm(v=>({...v,max_price:e.target.value}))}/></label><label className="wide">Nota de valoración<input value={serviceForm.pricing_note} onChange={e=>setServiceForm(v=>({...v,pricing_note:e.target.value}))}/></label></div><div className="crm-form-actions"><button className="crm-button primary" disabled={busy}>{editingServiceId?"Guardar cambios":"Añadir al catálogo"}</button>{editingServiceId&&<button type="button" className="crm-button secondary" onClick={()=>{setEditingServiceId(null);setServiceForm({code:"",name:"",min_price:"",max_price:"",pricing_note:""})}}>Cancelar edición</button>}</div></form>}
      <div className="crm-card-list">{services.map(s=><article className="crm-record-card" key={s.id}><div className="crm-record-main"><span className="crm-record-kicker">{s.code}</span><h3>{s.name}</h3><p>{s.pricing_note||'Precio orientativo sujeto al alcance.'}</p></div><div className="crm-record-controls"><strong>{s.min_price==null?'A consultar':money(s.min_price,s.currency)}{s.max_price!=null?' – '+money(s.max_price,s.currency):''}</strong>{owner&&<><button className="crm-button secondary small" onClick={()=>{setEditingServiceId(s.id);setServiceForm({code:s.code,name:s.name,min_price:s.min_price==null?'':String(s.min_price),max_price:s.max_price==null?'':String(s.max_price),pricing_note:s.pricing_note||''})}}>Editar</button><button className="crm-button secondary small" onClick={()=>void updateRow('crm_service_catalog',s.id,{active:!s.active},s.active?'Servicio desactivado.':'Servicio activado.')}>{s.active?'Desactivar':'Activar'}</button></>}{!s.active&&<span className="crm-muted">Inactivo</span>}</div></article>)}{!services.length&&<p className="crm-empty">No hay servicios en el catálogo.</p>}</div>
    </section>}
    <div className="crm-footer-note"><ShieldCheck size={16}/> Los permisos se aplican en Supabase mediante RLS y en las operaciones administrativas del servidor. <span>{busy?'Procesando…':'Datos sincronizados al actualizar'}</span></div>
  </main><SiteFooter/></>
}
