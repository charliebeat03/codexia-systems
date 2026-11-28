import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom'
const HomePage = lazy(() => import('./pages/HomePage'))
const InternalPage = lazy(() => import('./pages/InternalPage').then(module => ({ default: module.InternalPage })))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const DetailPage = lazy(() => import('./pages/DetailPage'))
const KnowledgePage = lazy(() => import('./pages/KnowledgePage'))
const FAQPage = lazy(() => import('./pages/FAQPage'))
const SupportPage = lazy(() => import('./pages/SupportPage'))
const EngagementPage = lazy(() => import('./pages/EngagementPage'))
const PortfolioPage = lazy(() => import('./pages/PortfolioPage'))
const QuotePage = lazy(() => import('./pages/QuotePage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const AccessPage = lazy(() => import('./pages/AccessPage'))
const PortalPage = lazy(() => import('./pages/PortalPage'))
const CRMPage = lazy(() => import('./pages/CRMWorkspace'))
import { AuthProvider } from './auth/AuthProvider'
import { SiteFooter, SiteHeader } from './components/SiteShell'
import SectionLoader from './components/SectionLoader'

const pageMeta: Record<string, { title: string; description: string }> = {
  '/': { title: 'Codexia Systems | Transformamos Procesos en Soluciones', description: 'Desarrollo de software, inteligencia artificial, aplicaciones y automatización para resolver necesidades reales.' },
  '/servicios': { title: 'Servicios | Codexia Systems', description: 'Desarrollo de software, inteligencia artificial, aplicaciones digitales y automatización de procesos.' },
  '/productos': { title: 'Productos | Codexia Systems', description: 'Conoce los productos digitales y plataformas que desarrollamos en Codexia Systems.' },
  '/proyectos': { title: 'Proyectos | Codexia Systems', description: 'Explora proyectos y soluciones digitales desarrolladas por Codexia Systems.' },
  '/nosotros': { title: 'Nosotros | Codexia Systems', description: 'Conoce la misión, visión y principios de Codexia Systems.' },
  '/contacto': { title: 'Contacto | Codexia Systems', description: 'Cuéntanos sobre tu idea, proyecto o proceso que quieres mejorar.' },
  '/recursos': { title: 'Centro de conocimiento | Codexia Systems', description: 'Guías y criterios prácticos para planificar productos digitales y tomar decisiones tecnológicas.' },
  '/preguntas-frecuentes': { title: 'Preguntas frecuentes | Codexia Systems', description: 'Respuestas sobre servicios, proyectos, presupuestos, entregas y soporte de Codexia Systems.' },
  '/soporte': { title: 'Centro de soporte | Codexia Systems', description: 'Prepara una consulta de soporte para productos y proyectos de Codexia Systems.' },
  '/contratacion': { title: 'Cómo trabajar con Codexia | Codexia Systems', description: 'Conoce las etapas generales para definir, proponer y desarrollar un proyecto con Codexia Systems.' },
  '/portafolio': { title: 'Portafolio | Codexia Systems', description: 'Conoce proyectos, productos y líneas de trabajo de Codexia Systems, con sus estados claramente identificados.' },
  '/presupuesto': { title: 'Solicitar presupuesto | Codexia Systems', description: 'Prepara una solicitud inicial para conversar sobre tu próximo proyecto digital de manera clara.' },
  '/privacidad': { title: 'Privacidad y datos | Codexia Systems', description: 'Información sobre los datos que se envían mediante los formularios de Codexia Systems y cómo se utilizan.' },
  '/acceso': { title: 'Acceso privado | Codexia Systems', description: 'Acceso privado para clientes y equipo de Codexia Systems.' },
  '/panel': { title: 'Mi espacio | Codexia Systems', description: 'Consulta tus proyectos, avances y documentos en Codexia Systems.' },
  '/panel/crm': { title: 'CRM | Codexia Systems', description: 'Gestión comercial interna de Codexia Systems.' },
}

function RouteEffects() {
  const { pathname } = useLocation()
  useEffect(() => {
    const routeParts = pathname.split('/').filter(Boolean)
    const detailSlug = routeParts[routeParts.length - 1] || ''
    const prettySlug = detailSlug.replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())
    const isDetail = pathname.split('/').filter(Boolean).length === 2
    const meta = pageMeta[pathname] ?? (isDetail ? { title: \`\${prettySlug} | Codexia Systems\`, description: \`Conoce el enfoque de Codexia Systems para \${prettySlug.toLowerCase()}.\` } : { title: 'Página no encontrada | Codexia Systems', description: 'La página que buscas no está disponible.' })
    document.title = meta.title
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!description) { description = document.createElement('meta'); description.name = 'description'; document.head.appendChild(description) }
    description.content = meta.description
    const setProperty = (property: string, content: string) => {
      let tag = document.querySelector<HTMLMetaElement>(\`meta[property="\${property}"]\`)
      if (!tag) { tag = document.createElement('meta'); tag.setAttribute('property', property); document.head.appendChild(tag) }
      tag.content = content
    }
    setProperty('og:title', meta.title)
    setProperty('og:description', meta.description)
    setProperty('og:url', \`\${window.location.origin}\${pathname}\`)
    setProperty('og:type', 'website')
    setProperty('og:image', \`\${window.location.origin}/assets/codexia-social-preview.webp\`)
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.appendChild(robots) }
    robots.content = pathname === '/acceso' || pathname.startsWith('/panel') ? 'noindex, nofollow' : 'index, follow'
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical) }
    canonical.href = \`\${window.location.origin}\${pathname}\`
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])
  return null
}

function NotFound() {
  return <><SiteHeader/><main id="contenido" className="section-wrap not-found"><div className="section-kicker">404 / PÁGINA NO ENCONTRADA</div><h1 className="internal-title">Esta ruta todavía no existe.</h1><p className="internal-intro">Puede que el enlace haya cambiado o que la dirección esté escrita incorrectamente.</p><Link className="button button-primary" to="/">Volver al inicio</Link></main><SiteFooter/></>
}

function AppRoutes() {
  return <><RouteEffects /><Suspense fallback={<SectionLoader />}><Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/servicios" element={<InternalPage page="servicios" />} />
    <Route path="/productos" element={<InternalPage page="productos" />} />
    <Route path="/proyectos" element={<InternalPage page="proyectos" />} />
    <Route path="/nosotros" element={<InternalPage page="nosotros" />} />
    <Route path="/contacto" element={<ContactPage />} />
    <Route path="/recursos" element={<KnowledgePage />} />
    <Route path="/recursos/:slug" element={<KnowledgePage />} />
    <Route path="/preguntas-frecuentes" element={<FAQPage />} />
    <Route path="/soporte" element={<SupportPage />} />
    <Route path="/contratacion" element={<EngagementPage />} />
    <Route path="/portafolio" element={<PortfolioPage />} />
    <Route path="/presupuesto" element={<QuotePage />} />
    <Route path="/privacidad" element={<PrivacyPage />} />
    <Route path="/acceso" element={<AccessPage />} />
    <Route path="/panel/crm" element={<CRMPage />} />
    <Route path="/panel" element={<PortalPage />} />
    <Route path="/servicios/:slug" element={<DetailPage />} />
    <Route path="/productos/:slug" element={<DetailPage />} />
    <Route path="/proyectos/:slug" element={<DetailPage />} />
    <Route path="*" element={<NotFound />} />
  </Routes></Suspense></>
}

export default function App() {
  return <BrowserRouter><AuthProvider><AppRoutes /></AuthProvider></BrowserRouter>
}
