import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Facebook, Github, Instagram, Linkedin, Youtube, Menu, X, type LucideIcon } from 'lucide-react'

type SocialLink = { label: string; href: string; icon: LucideIcon }

const configuredSocialLinks: SocialLink[] = [
  { label: 'Instagram', href: 'https://www.instagram.com/charlie___beast_03/', icon: Instagram },
  { label: 'Facebook', href: 'https://www.facebook.com/carlosalejandro.arciamiranda', icon: Facebook },
  { label: 'LinkedIn', href: import.meta.env.VITE_SOCIAL_LINKEDIN || '', icon: Linkedin },
  { label: 'YouTube', href: import.meta.env.VITE_SOCIAL_YOUTUBE || '', icon: Youtube },
  { label: 'GitHub', href: 'https://github.com/charliebeat03', icon: Github },
].filter((item) => /^https:\/\//i.test(item.href))

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)
  return <>
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    <header className="header">
      <Link className="brand" to="/" aria-label="Codexia Systems, inicio" onClick={closeMenu}>
        <img src="/assets/codexia-mark.webp" alt="" />
        <span>CODEXIA <b>SYSTEMS</b></span>
      </Link>
      <button className="menu-toggle" type="button" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} aria-controls="site-navigation" onClick={() => setMenuOpen((open) => !open)}>
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      <nav id="site-navigation" className={`nav internal-nav${menuOpen ? ' nav-open' : ''}`} aria-label="Navegación principal">
        <Link onClick={closeMenu} to="/">Inicio</Link><Link onClick={closeMenu} to="/servicios">Servicios</Link><Link onClick={closeMenu} to="/productos">Productos</Link>
        <Link onClick={closeMenu} to="/proyectos">Proyectos</Link><Link onClick={closeMenu} to="/portafolio">Portafolio</Link><Link onClick={closeMenu} to="/nosotros">Nosotros</Link>
        <Link onClick={closeMenu} to="/recursos">Recursos</Link><Link onClick={closeMenu} to="/preguntas-frecuentes">FAQ</Link>
        <Link onClick={closeMenu} className="nav-cta" to="/contacto">Hablemos <ArrowUpRight size={16} /></Link>
      </nav>
    </header>
  </>
}

export function SiteFooter() {
  return <footer className="footer site-footer">
    <div className="footer-brand-block">
      <Link className="brand" to="/" aria-label="Codexia Systems, inicio">
        <img src="/assets/codexia-mark.webp" alt="" />
        <span>CODEXIA <b>SYSTEMS</b></span>
      </Link>
      <p>Transformamos Procesos en Soluciones.</p>
      <small className="credit">Tecnología con propósito.</small>
    </div>

    <nav className="footer-column" aria-label="Explorar Codexia">
      <h2>Explorar</h2>
      <Link to="/servicios">Servicios</Link><Link to="/productos">Productos</Link>
      <Link to="/proyectos">Proyectos</Link><Link to="/portafolio">Portafolio</Link>
      <Link to="/nosotros">Nosotros</Link><Link to="/recursos">Centro de conocimiento</Link>
    </nav>

    <nav className="footer-column" aria-label="Ayuda y contacto">
      <h2>Ayuda y contacto</h2>
      <Link to="/contacto">Contacto</Link><Link to="/presupuesto">Solicitar presupuesto</Link>
      <Link to="/contratacion">Cómo contratar</Link><Link to="/soporte">Soporte</Link><Link to="/acceso">Área privada</Link>
      <Link to="/preguntas-frecuentes">Preguntas frecuentes</Link>
    </nav>

    <div className="footer-social-block">
      <h2>Conecta con Codexia</h2>
      {configuredSocialLinks.length > 0 ? <div className="footer-social-links">
        {configuredSocialLinks.map(({ label, href, icon: Icon }) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Codexia Systems en ${label}`} title={label}>
          <Icon size={18} aria-hidden="true" /><span>{label}</span><ArrowUpRight size={12} aria-hidden="true" />
        </a>)}
      </div> : <p className="footer-social-pending">Nuestros perfiles oficiales aparecerán aquí cuando se configuren.</p>}
      <Link className="footer-contact-cta" to="/contacto">Hablemos de tu proyecto <ArrowUpRight size={15} /></Link>
    </div>

    <div className="footer-bottom">
      <small>© {new Date().getFullYear()} Codexia Systems. Todos los derechos reservados.</small>
      <div className="footer-legal-links"><Link to="/privacidad">Privacidad y datos</Link><small>Hecho con intención y tecnología.</small></div>
    </div>
  </footer>
}
