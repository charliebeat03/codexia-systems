# Cambios

## v1.3 · Sitio corporativo sin personaje
- Retirados del proyecto el visor 3D, sus rutas, imágenes y archivos de modelo. No se incluyen en este ZIP.
- Retiradas las dependencias Three.js y React Three Fiber.
- Añadida página de contacto con formulario validado y resumen copiable; no simula enviar ni almacenar datos.
- Añadidos metadatos por ruta, URL canónica dinámica, datos estructurados Organization, `robots.txt` y `sitemap.xml`.
- Convertidos recursos gráficos a WebP para reducir peso y mejorar carga.
- Mejorado el estado 404, el desplazamiento al cambiar de página y la navegación interna.
- Actualizada la documentación y los pendientes de publicación.

## v1.2 · Páginas internas
- Añadidas páginas independientes para Servicios, Productos, Proyectos y Nosotros.

## v1.1 · Desarrollo corporativo
- Consolidada la identidad visual y la estructura de la página principal.
- Añadidas secciones de servicios, productos, proceso de trabajo y contacto.
- Incorporados responsive, foco visible y soporte para movimiento reducido.


## v1.4 · Desarrollo ampliado
- Añadidas páginas de detalle para servicios, productos y proyectos.
- Conectadas las tarjetas de las páginas de listado y la página principal con sus detalles.
- Incorporado endpoint serverless de contacto con validación de servidor, honeypot y envío mediante Resend.
- Añadido consentimiento explícito, estado de envío y alternativa para copiar el resumen.
- Ampliado sitemap con las rutas de detalle y metadatos Open Graph dinámicos.
- Añadidas cabeceras de seguridad y ejemplo de variables de entorno.
- KODI y todos sus recursos continúan excluidos.


## v1.5.0 · Conocimiento y relación con clientes
- Nuevo centro de conocimiento con tres guías introductorias.
- Nueva página de preguntas frecuentes agrupadas por tema.
- Nuevo centro de soporte con orientación para reportar problemas de forma segura.
- Nueva página que explica las etapas generales para trabajar con Codexia.
- Navegación y enlaces del pie actualizados en las páginas existentes.
- Sitemap ampliado.
- Se mantiene KODI completamente excluido.


## v1.6 · Portafolio y solicitud de presupuesto
- Añadida página de portafolio con estados transparentes y descripciones de proyectos.
- Añadido brief inicial de presupuesto con validación, rangos orientativos y copia local del resumen.
- Añadidas rutas, navegación y metadatos para ambas páginas.
- Actualizado sitemap y documentación.
- Sin KODI, recursos 3D, testimonios inventados ni métricas no verificadas.


## v1.7.0 · Portafolio enlazado y solicitudes de presupuesto
- World Tree Shop ahora se abre mediante el enlace descriptivo «Visitar World Tree Shop», sin mostrar la URL.
- En el portafolio se distinguen enlaces externos e internos para que cada nuevo proyecto pueda tener su propia acción.
- El formulario de presupuesto se conecta al endpoint seguro de contacto y envía organización, plazo y características junto con la descripción.
- El endpoint conserva compatibilidad con el formulario de contacto existente, valida ambos tipos de solicitud y escapa el contenido del correo.
- El envío real requiere configurar las tres variables privadas de Resend en Vercel; no se añadieron credenciales ficticias.

## v1.8 · Base de plataforma comercial
- Añadida migración SQL inicial para perfiles, roles, solicitudes comerciales, proyectos, actualizaciones, documentos y auditoría.
- RLS habilitado en todas las tablas y políticas diferenciadas para equipo y clientes.
- Los roles de autorización se basan en `app_metadata`, no en metadatos editables por el usuario.
- Documentada la arquitectura, la separación obligatoria de la base de World Tree Shop y los pasos de conexión.
- No se crea un login falso ni se expone un panel administrativo sin autenticación real.
- La migración no se ha ejecutado: requiere un proyecto Supabase independiente para Codexia Systems.


## v1.8.1 · Auditoría técnica previa a integración
- Corregido el estado y la versión descritos en la documentación principal.
- Aclarado que las solicitudes web aún no se almacenan en Supabase.
- Añadidos pendientes explícitos de instalación reproducible, pruebas de formularios, rate limiting persistente, perfiles, Storage y RLS.
- Reforzadas las políticas de inserción de actualizaciones, documentos y auditoría para vincular el actor con el usuario autenticado.
- No se ejecutó la migración ni se creó/conectó un proyecto Supabase.


## v1.8.2 - Contacto y footer corporativo
- Footer compartido y consistente en todas las páginas principales.
- Navegación agrupada por exploración, ayuda y contacto.
- Área de redes sociales configurable para Instagram, Facebook, LinkedIn, YouTube y GitHub.
- No se inventan URLs sociales: los enlaces se muestran solo cuando se proporcionan perfiles oficiales HTTPS.
- Página de contacto migrada al shell compartido sin eliminar el formulario ni sus alternativas de envío.


## v1.8.3 · Redes sociales oficiales
- Añadidos al footer los perfiles oficiales de Instagram, Facebook y GitHub proporcionados por el propietario.
- Se mantienen LinkedIn y YouTube como enlaces opcionales configurables.
- Actualizada la documentación y las variables de entorno de ejemplo.


## [1.8.4] - 2026-11-23
### Added
- Página de privacidad y datos personales.
- Enlaces de privacidad en formularios, footer y sitemap.
- Configuración explícita de build para Vercel y detección de pnpm/Node.
### Changed
- El fallback de la SPA excluye rutas `/api/` para preservar funciones serverless.


## v1.9.0 · Primera capa de backend CRM
- `POST /api/contact` valida y persiste las solicitudes en Supabase `leads` usando una clave secreta solo del servidor.
- El envío Resend se desacopla del almacenamiento: una incidencia de correo no descarta el lead ya registrado.
- Nuevo `GET /api/health` para verificar acceso al backend sin revelar datos sensibles.
- La migración añade creación automática de perfiles cliente, triggers `updated_at`, bucket privado de documentos y políticas de Storage por proyecto.
- Se documentan variables privadas y pasos de activación en Vercel Preview.
- El proyecto Supabase aún no está creado ni conectado; no se ejecutó la migración.


## v1.10.0 · Autenticación, CRM y portal privado
- Añadido cliente Supabase público con PKCE y sesión persistente.
- Nueva ruta `/acceso` con inicio de sesión, recuperación y establecimiento de contraseña.
- Nuevo `/panel` con vistas diferenciadas por rol: resumen, consultas, proyectos, actualizaciones y usuarios.
- Equipo autorizado puede crear proyectos, asignar clientes, actualizar progreso, publicar notas internas o compartidas y subir documentos privados.
- Clientes consultan solo sus proyectos, actualizaciones compartidas y documentos autorizados.
- Añadidos endpoints server-side para invitar usuarios y asignar roles con verificación de JWT y clave secreta.
- Perfiles incluyen correo sincronizado desde Auth; roles de autorización siguen basados en `app_metadata`.
- Rutas privadas marcadas `noindex`.
- Rate limit persistente del formulario mediante hash HMAC y RPC restringida al rol `service_role`.
- Guía de configuración, bootstrap del primer owner y variables de entorno documentadas.
- Supabase no está creado ni conectado; no se ejecutaron migraciones ni pruebas reales de RLS.

## v1.10.2 · Consolidación del backend y preparación de Preview
- Alineada la historia local de migraciones con las tres migraciones aplicadas en el proyecto Supabase dedicado.
- Añadidos tipos TypeScript del esquema real de Supabase y tipado del cliente.
- Añadida protección de tamaño máximo y validación del cuerpo JSON al endpoint público de contacto.
- Ampliado `/api/health` para comprobar las tablas `profiles` y `leads` sin devolver datos.
- Incorporadas 14 pruebas automatizadas Node.js para formularios, honeypot, rate limit, persistencia simulada y salud del backend.
- Actualizados los textos de contacto/privacidad y las guías de activación, migraciones y Vercel Preview.
- La compilación completa y el lockfile siguen pendientes porque el registro npm no es accesible desde este entorno.


## v1.10.2 · Endurecimiento de API y estado real de Auth
- El endpoint administrativo rechaza cuerpos JSON no-objeto y limita el tamaño de entrada a 8 KiB.
- Documentación actualizada: el propietario inicial ya existe, el correo está confirmado y el rol `owner` está sincronizado en Auth y `profiles`.
- Auditoría Supabase ampliada con los avisos actuales de seguridad y rendimiento.
- Se conserva pendiente el build completo y el lockfile porque Corepack no puede resolver `registry.npmjs.org` en este entorno.

## [1.10.3] - 2026-11-24

### Fixed
- Added the React 18 TypeScript declaration packages `@types/react` and `@types/react-dom` as development dependencies. This resolves the missing `JSX.IntrinsicElements` declarations reported by the Vercel TypeScript build and allows JSX event handler types to be inferred.

### Validation
- `npm run verify`: passed (14 tests, API syntax checks passed).
- Production frontend build: not executed in this environment because dependency installation did not complete. Re-run the Vercel Preview deployment to validate the complete TypeScript/Vite build.


## v1.10.4 · Ciclo de vida de proyectos y usuarios
- Añadido borrado administrativo de proyectos con validación de rol en servidor, eliminación de registros relacionados por FK y limpieza posterior del bucket privado.
- Añadido borrado administrativo de cuentas: el propietario puede eliminar cuentas no propietarias; los administradores solo clientes y equipo.
- La cuenta propietaria y la sesión del actor quedan protegidas; las cuentas con documentos subidos deben reasignar esos documentos antes de eliminarse.
- El borrado de una cuenta conserva los proyectos asignados, que quedan sin cliente vinculado.
- Completado y archivado siguen siendo estados de conservación, no borrado.
- Pendiente validar las operaciones destructivas en un entorno aislado; no se han creado ni eliminado datos reales.
