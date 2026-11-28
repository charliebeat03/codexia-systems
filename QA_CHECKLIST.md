# Checklist de calidad · Codexia Systems v1.10.2

## Código y configuración
- [x] Versionado de paquete actualizado a 1.10.4.
- [x] Dependencias directas fijadas en `package.json`.
- [x] Variables de entorno de ejemplo sin secretos reales.
- [x] Cliente frontend utiliza solo publishable key.
- [x] Tipos TypeScript del esquema Supabase añadidos.
- [x] Configuración Vercel con salida `dist`, fallback SPA y cabeceras de seguridad.
- [ ] Instalar dependencias y generar `pnpm-lock.yaml` (bloqueado por indisponibilidad DNS del registro npm en este entorno).
- [x] Ejecutar `pnpm build` y corregir errores TypeScript/Vite (CI y Preview Vercel completados).

## Navegación y páginas
- [x] Footer compartido y rutas públicas implementadas.
- [x] Página de contacto conserva validación, consentimiento, honeypot y copia del resumen.
- [x] Página de presupuesto utiliza el endpoint común.
- [x] Texto de contacto/privacidad actualizado para reflejar el CRM Supabase ya preparado.
- [ ] Revisar visualmente todas las rutas en navegador.
- [ ] Comprobar navegación por teclado, foco visible, menú móvil y enlaces del footer.
- [ ] Confirmar recarga directa de rutas internas en Preview.

## Formularios y API
- [x] `api/contact.js`, `api/health.js`, `api/admin/users.js` y `api/admin/projects.js` están incluidos en `node --check` (validación CI pendiente).
- [x] 17 pruebas automatizadas con Node.js superadas (incluye validación básica de endpoints administrativos).
- [x] Validación de campos, consentimiento y honeypot.
- [x] Rate limiting persistente por HMAC mediante RPC reservada a `service_role`.
- [x] Endpoint de contacto preparado para insertar leads en `public.leads`.
- [x] Endpoint `/api/health` para comprobar acceso al backend.
- [x] API administrativa limita cuerpos a 8 KiB y rechaza JSON que no sea un objeto.
- [x] Endpoints DELETE protegidos para proyectos y usuarios; protección de owner, permisos por rol y confirmación en interfaz.
- [x] Eliminación de proyectos conserva auditoría y solicita limpieza de Storage; la cuenta no se elimina si figura como autora de documentos.
- [ ] Verificar borrado completo en entorno de prueba, incluida limpieza de Storage y comportamiento de sesiones JWT.
- [ ] Configurar variables públicas/privadas en Vercel Preview y probar llamadas reales.
- [ ] Configurar Resend y verificar dominio remitente, si se desean notificaciones.
- [ ] Probar rate limit concurrente en Preview.

## Supabase
- [x] Proyecto dedicado `Codexia Systems` creado y activo.
- [x] 6 tablas públicas con RLS habilitado.
- [x] 21 políticas RLS públicas registradas.
- [x] Tabla privada de rate limit con RLS y permisos cerrados a roles públicos.
- [x] RPC de rate limit ejecutable solo por `service_role`.
- [x] Bucket privado `project-documents`, 10 MB, tipos MIME permitidos.
- [x] 3 migraciones aplicadas y archivos locales alineados con las versiones remotas.
- [x] Cuenta inicial creada, correo confirmado y rol `owner` sincronizado en Auth y `profiles`.
- [x] Iniciar sesión desde el Preview; propietario confirmó acceso y el rol `owner` está sincronizado en Auth y `profiles`.
- [ ] Probar Auth, invitaciones y recuperación con SMTP.
- [ ] Probar aislamiento entre dos clientes distintos (no se han creado cuentas ni proyectos de prueba en la base real).
- [ ] Probar Storage con staff, cliente propietario y cliente ajeno.

## Accesibilidad, responsive y SEO
- [ ] Verificar contraste WCAG 2.2 AA.
- [ ] Probar 320, 360, 390, 768, 1024 y 1440 px (se corrigió el saludo del portal y se añadieron protecciones de desbordamiento; falta la revisión visual completa).
- [ ] Probar zoom 200%, teclado y lector de pantalla.
- [ ] Verificar `prefers-reduced-motion` y objetivos táctiles.
- [ ] Validar títulos, canonical, Open Graph, sitemap y robots en Preview.
- [ ] Ejecutar Lighthouse móvil y revisar rendimiento.

## GitHub y publicación
- [x] `.gitignore` excluye secretos y artefactos locales.
- [ ] Generar `pnpm-lock.yaml` y completar build reproducible.
- [ ] Completar revisión funcional y responsive.
- [ ] Subir a GitHub cuando el propietario lo decida.
- [x] Crear deployment Preview en Vercel.
- [ ] Obtener autorización expresa antes de promover a Production.
