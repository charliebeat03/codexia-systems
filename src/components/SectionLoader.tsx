import './section-loader.css'

export default function SectionLoader() {
  return (
    <main className="section-loader" role="status" aria-live="polite" aria-label="Cargando sección">
      <div className="section-loader-card">
        <div className="section-loader-mark">
          <img src="/assets/codexia-mark.webp" alt="" />
          <span className="section-loader-ring" />
        </div>
        <span className="section-loader-kicker">CODEXIA SYSTEMS</span>
        <h1>Preparando tu espacio</h1>
        <p>Estamos cargando el contenido de esta sección.</p>
        <div className="section-loader-track" aria-hidden="true"><span /></div>
        <span className="section-loader-caption">Un momento, por favor</span>
      </div>
    </main>
  )
}
