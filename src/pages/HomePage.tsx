import { useEffect, useState } from 'react'
import { ArrowRight, ArrowUpRight, Menu, X, Code2, BrainCircuit, Smartphone, Workflow, ChevronDown, Layers3, ShieldCheck, Sparkles, Lightbulb, Target, Compass, CheckCircle2 } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { SiteFooter } from '../components/SiteShell'

const services = [
  { icon: Code2, slug:'desarrollo-de-software', n: '01', title: 'Desarrollo de software', text: 'Sistemas y herramientas digitales creados alrededor de los procesos reales de cada organización.', points: ['Aplicaciones web', 'Sistemas de gestión', 'Integración de herramientas'] },
  { icon: BrainCircuit, slug:'inteligencia-artificial', n: '02', title: 'Inteligencia artificial', text: 'Aplicamos IA cuando aporta valor: para organizar información, asistir tareas y mejorar flujos de trabajo.', points: ['Asistentes inteligentes', 'Procesamiento de información', 'Automatización asistida'] },
  { icon: Smartphone, slug:'aplicaciones-y-plataformas', n: '03', title: 'Aplicaciones y plataformas', text: 'Experiencias web y móviles accesibles, adaptables y preparadas para evolucionar.', points: ['Diseño responsive', 'PWA y aplicaciones', 'Experiencias centradas en usuarios'] },
  { icon: Workflow, slug:'automatizacion-de-procesos', n: '04', title: 'Automatización de procesos', text: 'Conectamos tareas, datos y herramientas para reducir operaciones repetitivas y fricción.', points: ['Optimización de procesos', 'Flujos de trabajo', 'Conexión de servicios'] },
]
const projects = [
  { slug:'catalogo-world-tree-shop', tag: 'COMERCIO DIGITAL', title: 'World Tree Shop', status: 'Proyecto desarrollado', text: 'Catálogo digital con gestión de productos, precios y disponibilidad, pensado para facilitar pedidos y consultas.', url: 'https://tienda.codexiasystems.dpdns.org', action: 'Explorar proyecto', symbol: 'WT', tone: 'blue' },
  { slug:'plataforma-beautyflow', tag: 'GESTIÓN PARA PROFESIONALES', title: 'BeautyFlow', status: 'En desarrollo', text: 'Una propuesta de gestión y presencia digital para profesionales independientes del sector de la belleza.', url: '#contacto', action: 'Conocer el proyecto', symbol: 'BF', tone: 'violet' },
  { slug:'soluciones-a-medida', tag: 'SOLUCIONES A MEDIDA', title: 'Sistemas empresariales', status: 'Línea de soluciones', text: 'Herramientas digitales adaptadas a las necesidades operativas de cada negocio y equipo.', url: '#contacto', action: 'Hablar sobre una idea', symbol: 'CS', tone: 'cyan' },
]
const steps = [
  { icon: Lightbulb, n: '01', title: 'Escuchamos', text: 'Entendemos el problema, el contexto y lo que realmente necesita resolverse.' },
  { icon: Compass, n: '02', title: 'Diseñamos', text: 'Definimos una solución clara, viable y centrada en quienes la utilizarán.' },
  { icon: Code2, n: '03', title: 'Construimos', text: 'Desarrollamos, probamos y refinamos cada parte del producto.' },
  { icon: Target, n: '04', title: 'Evolucionamos', text: 'Acompañamos la mejora continua para que la solución siga siendo útil.' },
]
function App() {
  const [open, setOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const close = () => setOpen(false)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const reveal = reduceMotion ? {} : { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: .15 }, transition: { duration: .55 } }

  return <div>
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    <header className="header">
      <a className="brand" href="#inicio" onClick={close} aria-label="Codexia Systems, inicio"><img src="/assets/codexia-mark.webp" alt="" /><span>CODEXIA <b>SYSTEMS</b></span></a>
      <button className="menu-toggle" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} aria-controls="main-navigation" onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button>
      <nav id="main-navigation" className={open ? 'nav nav-open' : 'nav'} aria-label="Navegación principal">
        {['Inicio','Servicios','Productos','Proyectos','Nosotros','Recursos','FAQ'].map((x,i)=><Link key={x} to={['/','/servicios','/productos','/proyectos','/nosotros','/recursos','/preguntas-frecuentes'][i]} onClick={close}>{x}</Link>)}
        <Link className="nav-cta" to="/contacto" onClick={close}>Hablemos <ArrowUpRight size={16}/></Link>
      </nav>
    </header>

    <main id="contenido">
      <section className="hero section-wrap" id="inicio">
        <div className="hero-glow glow-a"/><div className="hero-glow glow-b"/>
        <div className="hero-copy">
          <div className="eyebrow"><span className="pulse"/> TECNOLOGÍA CON PROPÓSITO</div>
          <motion.h1 {...(reduceMotion ? {} : { initial:{opacity:0,y:20}, animate:{opacity:1,y:0}, transition:{duration:.65} })}>Transformamos procesos <em>en soluciones.</em></motion.h1>
          <p className="hero-lead">Convertimos ideas y desafíos reales en productos digitales útiles, inteligentes y preparados para avanzar.</p>
          <div className="hero-actions"><a className="button button-primary" href="#servicios">Explorar soluciones <ArrowUpRight size={18}/></a><a className="text-link" href="#nosotros">Conoce Codexia <ArrowRight size={17}/></a></div>
          <div className="hero-proof"><span><i/> Desarrollo centrado en las personas</span><span><i/> Tecnología práctica</span></div>
        </div>
        <motion.div className="hero-art" {...(reduceMotion ? {} : { initial:{opacity:0,scale:.94}, animate:{opacity:1,scale:1}, transition:{duration:.8,delay:.12} })} aria-label="Símbolo de Codexia Systems">
          <div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/>
          <div className="art-card"><div className="art-top"><span>CODEXIA / SYSTEMS</span><Sparkles size={17}/></div><img className="hero-mark" src="/assets/codexia-mark.webp" alt="Símbolo geométrico de Codexia Systems"/><div className="art-bottom"><b>Ideas que se convierten en sistemas.</b><small>DESIGN · ENGINEERING · INNOVATION</small></div></div>
          <div className="floating-chip chip-one"><Layers3 size={16}/> Digital products</div><div className="floating-chip chip-two"><ShieldCheck size={16}/> Built with purpose</div>
          <div className="art-caption">INNOVACIÓN <b>·</b> TECNOLOGÍA <b>·</b> RESULTADOS</div>
        </motion.div>
        <a href="#servicios" className="scroll-cue">DESCUBRE MÁS <ChevronDown size={15}/></a>
      </section>

      <motion.section className="intro section-wrap" id="nosotros" {...reveal}>
        <div className="section-kicker">01 / QUIÉNES SOMOS</div>
        <div className="intro-grid"><h2>La tecnología tiene sentido cuando <em>resuelve algo.</em></h2><div><p>En Codexia Systems diseñamos y desarrollamos soluciones digitales que conectan tecnología con necesidades concretas. Trabajamos para simplificar procesos, crear nuevas posibilidades y convertir ideas en herramientas que aportan valor.</p><a className="inline-link" href="#contacto">Conversemos sobre tu idea <ArrowUpRight size={16}/></a></div></div>
        <div className="principles"><div><span>01</span><b>Claridad</b><small>Primero entendemos el problema.</small></div><div><span>02</span><b>Utilidad</b><small>La tecnología debe servir para algo.</small></div><div><span>03</span><b>Evolución</b><small>Construimos pensando en el futuro.</small></div></div>
      </motion.section>

      <section className="services section-wrap" id="servicios">
        <motion.div className="section-heading" {...reveal}><div><div className="section-kicker">02 / LO QUE HACEMOS</div><h2>Soluciones para <em>avanzar.</em></h2></div><p>Un enfoque flexible para construir tecnología útil, desde una herramienta puntual hasta una plataforma completa.</p></motion.div>
        <div className="service-grid">{services.map(({icon:Icon,slug,n,title,text,points})=><motion.article className="service-card" key={n} {...reveal}><div className="service-meta"><span>{n}</span><Icon size={22}/></div><h3>{title}</h3><p>{text}</p><ul>{points.map(point=><li key={point}><CheckCircle2 size={13}/>{point}</li>)}</ul><Link className="inline-link" to={`/servicios/${slug}`}>Explorar servicio <ArrowUpRight size={15}/></Link><div className="card-line"/></motion.article>)}</div>
      </section>

      <section className="products section-wrap" id="productos">
        <motion.div className="section-heading" {...reveal}><div><div className="section-kicker">03 / PROYECTOS Y PRODUCTOS</div><h2>Ideas que toman <em>forma.</em></h2></div><p>Proyectos y líneas de producto que muestran cómo llevamos las ideas a soluciones digitales.</p></motion.div>
        <div className="project-grid">{projects.map((p,i)=><motion.article className="project-card" key={p.title} {...reveal}><div className={`project-visual visual-${p.tone}`}><span>{p.tag}</span><div className="project-symbol">{p.symbol}</div><div className="visual-orb"/></div><div className="project-info"><div className="project-status"><i/>{p.status}</div><h3>{p.title}</h3><p>{p.text}</p><Link to={`/proyectos/${p.slug}`}>{p.action} <ArrowUpRight size={16}/></Link>{p.title==='World Tree Shop'&&<a href={p.url} target="_blank" rel="noreferrer">Visitar sitio <ArrowUpRight size={16}/></a>}</div></motion.article>)}</div>
      </section>

      <section className="process section-wrap">
        <motion.div className="section-heading" {...reveal}><div><div className="section-kicker">04 / CÓMO TRABAJAMOS</div><h2>Del desafío al <em>resultado.</em></h2></div><p>Un proceso colaborativo, transparente y enfocado en entregar valor en cada etapa.</p></motion.div>
        <div className="process-grid">{steps.map(({icon:Icon,n,title,text})=><article className="process-step" key={n}><div className="process-icon"><Icon size={20}/></div><span>{n}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="contact section-wrap" id="contacto"><div className="contact-panel"><div className="contact-glow"/><div className="section-kicker">05 / HAGAMOS QUE SUCEDA</div><h2>¿Tienes una idea?<br/><em>Construyámosla.</em></h2><p>Cuéntanos qué proceso quieres mejorar o qué solución te gustaría desarrollar.</p><Link className="button button-primary" to="/contacto">Cuéntanos tu proyecto <ArrowRight size={17}/></Link><small className="contact-note">Sin compromisos. Primero entendemos lo que necesitas.</small></div></section>
    </main>
    <SiteFooter/>
  </div>
}
export default App
