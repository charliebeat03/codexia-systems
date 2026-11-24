# Codexia Systems · Web corporativa

## Estado
Versión de desarrollo v1.10.2. **Frontend y backend preparados para la primera revisión en Vercel Preview.** La base de datos dedicada de Supabase ya está creada, las migraciones están aplicadas y las verificaciones de esquema/RLS se completaron. La compilación completa sigue pendiente porque el registro npm no respondió en este entorno. No apuntar el dominio principal ni tratarla como producción hasta completar build, pruebas funcionales y revisión visual.

## Stack
- React 18 + TypeScript + Vite
- React Router DOM
- Supabase JS 2.119.2 (Auth, Postgres y Storage con RLS)
- Framer Motion
- Lucide React

No se incluyen dependencias de Three.js ni React Three Fiber en esta versión.

## Requisitos y ejecución
Requiere Node.js 22 o superior y pnpm 9.15.5.

```bash
pnpm install
pnpm dev
```

La guía para la primera subida y el deployment Preview está en `docs/GITHUB_VERCEL_PREVIEW.md`.

## Compilar y previsualizar
```bash
pnpm build
pnpm preview
```

## Rutas
- `/` Inicio corporativo
- `/servicios` Servicios
- `/productos` Productos
- `/proyectos` Portafolio
- `/nosotros` Quiénes somos
- `/contacto` Formulario de consulta con endpoint de envío
- `/privacidad` Información sobre tratamiento y uso de datos
- `/acceso` Inicio de sesión, recuperación y establecimiento de contraseña
- `/panel` Panel interno y portal privado de clientes (requiere Supabase configurado)

## Contacto, presupuesto, privacidad y redes sociales
- `/contacto` ofrece un formulario de proyecto con validación, consentimiento explícito, enlace a la información de privacidad, honeypot y alternativa para copiar el resumen si el servicio de correo no está disponible.
- `/privacidad` describe los datos solicitados, finalidades, envío mediante proveedores, conservación actual y canal para consultas relacionadas con datos personales.
- `/presupuesto` permite preparar una solicitud más detallada. Ambos formularios utilizan `POST /api/contact`.
- El footer corporativo compartido incluye accesos a servicios, proyectos, recursos, soporte, presupuesto y contacto en todas las páginas principales.
- Instagram, Facebook y GitHub ya enlazan a los perfiles oficiales proporcionados por el propietario. LinkedIn y YouTube permanecen opcionales y solo aparecerán cuando se configuren URLs HTTPS válidas.

## Formularios de contacto y presupuesto
Los formularios validan campos en el navegador y en el servidor, exigen consentimiento explícito, incorporan un campo honeypot y permiten copiar un resumen alternativo. El endpoint `POST /api/contact` recibe ambos formularios, valida y guarda en Supabase CRM; después intenta enviar una notificación mediante Resend cuando se configuran las variables privadas de `.env.example`. El endpoint guarda primero cada solicitud en Supabase `leads` mediante una clave secreta exclusiva del servidor. La notificación Resend se intenta después; si el correo falla, la consulta permanece registrada y el formulario comunica ese estado. La migración incluye un limitador persistente por hash HMAC de IP, consumido mediante una función SQL cuyo permiso de ejecución se reserva al rol `service_role`. Debe probarse con solicitudes concurrentes en Supabase Preview antes de producción.

## SEO y metadatos
- Título y descripción por ruta.
- URL canónica dinámica basada en el host activo.
- Open Graph básico y datos estructurados Organization.
- `public/robots.txt` y `public/sitemap.xml` preparados para `https://codexiasystems.dpdns.org`.
- Confirmar que el dominio raíz apunta al despliegue antes de enviar el sitemap a buscadores.

## Identidad y UX
- Paleta: cyan `#00D4FF`, azul `#0066FF`, violeta `#8A2BFF`, navy `#0A0F1F`.
- Diseño mobile-first, navegación responsive y enlaces de navegación accesibles.
- Enlace para saltar al contenido, foco visible y respeto a `prefers-reduced-motion`.
- Formulario con etiquetas visibles, validación de cliente/servidor, consentimiento y estados reales de envío.
- Página 404 y desplazamiento al inicio al cambiar de ruta.

## Recursos incluidos
- `public/assets/codexia-mark.webp`: isotipo transparente optimizado.
- `public/assets/codexia-mark.png`: original PNG del isotipo.
- `public/assets/codexia-logo.png`: logotipo suministrado.
- `public/assets/codexia-social-preview.webp`: vista previa social optimizada.
- `public/favicon.png`: favicon derivado del isotipo.

## Plataforma comercial y portal privado v1.10.2
- `src/lib/supabase.ts` inicializa el cliente público con `VITE_SUPABASE_PUBLISHABLE_KEY` (o `VITE_SUPABASE_ANON_KEY` legacy); nunca recibe la clave secreta.
- `src/auth/AuthProvider.tsx` mantiene sesión y rol procedente de `app_metadata`.
- `/acceso` permite iniciar sesión, recuperar contraseña y establecer contraseña tras invitación.
- `/panel` presenta el CRM y gestión de proyectos al equipo, y el portal de seguimiento a cada cliente.
- `POST /api/admin/users` invita cuentas; `PATCH /api/admin/users` modifica roles. Ambas operaciones validan el JWT en servidor y usan la clave secreta únicamente en Vercel.
- Las migraciones remotas `20261124090443`, `20261124090454` y `20261124091542` están aplicadas en el proyecto Supabase `nzcqmuwxjuvfvcdcynjz`; sus archivos locales están alineados con esa historia.
- Las seis tablas públicas tienen RLS habilitado y hay 21 políticas registradas. La tabla privada de rate limit está protegida y la RPC solo concede ejecución a `service_role`.
- El bucket `project-documents` es privado, con límite de 10 MB y tipos permitidos configurados.
- El portal de clientes consulta proyectos asignados, actualizaciones con visibilidad `client` y documentos compartidos, protegidos por RLS y Storage.
- El primer usuario ya fue creado, su correo está confirmado y su rol `owner` está sincronizado entre `auth.users.app_metadata` y `public.profiles`. El acceso desde la web queda pendiente de configurar las variables públicas y crear el primer Preview. Las pruebas funcionales de Auth, invitaciones y aislamiento siguen pendientes.
- Se incorporaron tipos TypeScript del esquema y pruebas automatizadas de los endpoints de contacto y salud.

Guía detallada: `docs/PORTAL_V1.10.2.md`.

## Pendiente antes de producción
- Confirmar identidad legal del responsable y canal de contacto para privacidad.
- Definir plazos de conservación de consultas.
- Confirmar correo corporativo y WhatsApp si se desea mostrar un canal directo. Instagram, Facebook y GitHub ya están configurados; LinkedIn y YouTube son opcionales.
- Configurar Resend, verificar el dominio remitente y definir el correo oficial de recepción.
- Confirmar el dominio raíz y revisar DNS/HTTPS.
- Revisar y aprobar descripciones de servicios y proyectos.
- Instalar dependencias, generar `pnpm-lock.yaml`, ejecutar `pnpm build` y probar en móviles y escritorio.
- Comprobar contraste WCAG, navegación por teclado, zoom al 200% y lectores de pantalla.
- Configurar analítica respetuosa con la privacidad, si se decide utilizarla.


## Verificación de esta entrega

- 14 pruebas automatizadas Node.js superadas (`node --test`).
- El endpoint administrativo ahora rechaza JSON no-objeto y cuerpos mayores de 8 KiB antes de procesar invitaciones o cambios de rol.
- Los tres endpoints serverless superan `node --check`.
- Se verificó en Supabase el proyecto activo, las seis tablas con RLS, las 21 políticas públicas, los permisos de la RPC y el bucket privado.
- No se generó `pnpm-lock.yaml` ni se ejecutó `pnpm build`: Corepack no pudo descargar pnpm por error DNS `EAI_AGAIN` al resolver `registry.npmjs.org`.
- No se desplegó en Vercel ni se subió a GitHub.

## Historial de versiones

### v1.4 · Páginas de detalle y contacto preparado para envío
- Páginas individuales para cada servicio, producto y proyecto.
- Metadatos dinámicos por ruta y sitemap ampliado.
- Formulario con validación, consentimiento explícito, campo honeypot y envío serverless mediante Resend.
- El envío requiere configurar las variables de entorno indicadas en `.env.example`. No se incluye ninguna clave ni correo inventado.
- API: `POST /api/contact`. Se ejecuta como función serverless en Vercel; en desarrollo local requiere `vercel dev` o un entorno compatible con funciones Vercel.
- El limitador por IP incluido es básico y de memoria de instancia; para producción con tráfico significativo debe sustituirse por rate limiting persistente.

### Configurar recepción de consultas
1. Crear una cuenta en Resend y verificar el dominio remitente.
2. Copiar `.env.example` a `.env.local` y completar las tres variables.
3. Configurar las mismas variables como secretos del proyecto cuando se decida desplegar.
4. Probar envío, respuesta al correo del remitente y rechazo de campos inválidos.

El formulario no almacena consultas en una base de datos. Envía el mensaje al correo de destino configurado.

## Estado de validación de v1.4
- Sintaxis de los seis archivos TypeScript/TSX comprobada: sin errores de parseo.
- `api/contact.js` validado con `node --check`.
- `package.json`, `vercel.json` y `sitemap.xml` validados estructuralmente.
- La compilación completa de Vite/TypeScript sigue pendiente porque la instalación de dependencias no terminó en este entorno.

## Nuevas secciones v1.5
- `/recursos`: centro de conocimiento con guías introductorias.
- `/recursos/:slug`: lectura individual de cada guía.
- `/preguntas-frecuentes`: FAQ nativa mediante elementos accesibles `details/summary`.
- `/soporte`: instrucciones para preparar solicitudes de asistencia y proteger datos sensibles.
- `/contratacion`: etapas generales de descubrimiento, alcance, propuesta, desarrollo y entrega.

El contenido de recursos es educativo y general. La página de soporte no promete atención inmediata ni sustituye condiciones de soporte acordadas. La página de contratación no representa una oferta comercial ni fija precios o plazos.

## Verificación pendiente en v1.5 (registro histórico)
La compilación requería instalar las dependencias. En este entorno la conexión al registro npm falló por resolución DNS (`EAI_AGAIN`), por lo que no se pudo ejecutar un build completo. Tras instalar con `pnpm install`, ejecutar `pnpm build` y revisar en navegador las rutas nuevas antes de desplegar.


## v1.6 · Portafolio y solicitudes iniciales
- Nueva página `/portafolio` con casos y estados diferenciados (implementado, en desarrollo y línea de trabajo).
- Nueva página `/presupuesto` con brief validado en cliente y selección de presupuesto/plazo orientativos.
- El formulario de presupuesto ahora puede enviar la solicitud a `POST /api/contact`; si el correo no está configurado o falla el envío, permite copiar el resumen como alternativa.
- El portafolio presenta enlaces como acciones descriptivas, nunca como URLs visibles. World Tree Shop abre en una pestaña nueva; los enlaces internos siguen usando navegación local.
- No se publican métricas, testimonios ni resultados de clientes sin evidencia verificable.
- KODI y sus archivos siguen excluidos.

## v1.8 · Base de plataforma comercial
Se incorpora `supabase/migrations/20261124090443_codexia_commercial_core.sql` y `docs/COMMERCIAL_PLATFORM.md` como base de datos inicial para CRM, proyectos de clientes, actualizaciones, documentos y auditoría. **No ejecutar en el proyecto `worldtree`** ni en ninguna base de datos de otro producto. La migración se aplicó posteriormente en el proyecto Supabase dedicado de Codexia Systems; el estado vigente se documenta en `docs/COMMERCIAL_PLATFORM.md`. No se ha habilitado un panel público ni autenticación simulada.

La migración aplica RLS a todas las tablas, usa `app_metadata` para roles de autorización y concede acceso de Data API únicamente a `authenticated`. Revisar y probar las políticas con cuentas de roles distintos antes de producción.

## Resend y correo
No es necesario haber creado ya el buzón corporativo para preparar Resend. Para el envío real se necesita verificar el dominio remitente en Resend; el correo de destino puede ser temporalmente una dirección existente que controles. Configura las tres variables de entorno del archivo `.env.example` en un entorno privado, nunca en variables `VITE_*`.


## v1.8.2 · Contacto y footer corporativo
- Unificado el footer en la página de inicio, páginas internas y página de contacto.
- Añadidas columnas de navegación, ayuda/contacto y bloque de redes sociales.
- Preparada la configuración de Instagram, Facebook, LinkedIn, YouTube y GitHub mediante variables de entorno públicas que contienen únicamente URLs de perfiles.
- Los enlaces sociales permanecen ocultos hasta configurar URLs oficiales HTTPS; no se publican perfiles supuestos.
- La página de contacto ahora reutiliza la cabecera y el footer comunes. Se conserva el formulario, el consentimiento, la validación, el estado de envío y la alternativa de copiar el resumen.
- Se amplió el footer responsive para escritorio, tablet y móvil.


## v1.8.3 · Perfiles sociales oficiales
- Configurados los enlaces oficiales de Instagram, Facebook y GitHub proporcionados por el propietario.
- Se mantienen LinkedIn y YouTube como canales opcionales, sin inventar perfiles.
- Actualizada la documentación y el ejemplo de variables de entorno para reflejar la configuración real.


## v1.8.4 · Privacidad y preparación de Vercel
- Añadida la página `/privacidad` y enlazada desde los consentimientos de contacto y presupuesto.
- Incorporado el acceso a privacidad en el footer.
- Añadida la ruta al sitemap.
- Preparada la configuración de compilación Vite para Vercel (`pnpm build`, salida `dist`) y excluido el fallback SPA para rutas `/api/`.
- Declarados `pnpm@9.15.5` y Node.js 20 o superior en `package.json` para que Vercel pueda detectar el gestor y el runtime.
- No se han añadido claves, direcciones de correo ni credenciales.

## Flujo de publicación acordado
1. Subir el código a un repositorio GitHub dedicado a Codexia Systems.
2. Importar ese repositorio en Vercel y dejar que Vercel instale dependencias y ejecute el build.
3. Revisar primero el deployment Preview generado por Vercel, sin apuntar todavía el dominio principal.
4. Corregir interfaz, responsive, rutas y formularios mediante commits en GitHub.
5. Configurar Resend y Supabase por separado cuando estén listos los datos y credenciales.

La página de privacidad describe el comportamiento técnico actual, pero antes de producción definitiva deben confirmarse la identidad legal del responsable, un canal de contacto de privacidad y los plazos de conservación. En Vercel, las rutas de funciones del sistema de archivos (`/api/*`) tienen prioridad sobre el rewrite SPA general.


## v1.9.0 · Primera capa de backend CRM
- `POST /api/contact` persiste consultas en `public.leads` usando `SUPABASE_SECRET_KEY` exclusivamente en servidor.
- Resend queda desacoplado del almacenamiento: una incidencia de correo no descarta una consulta ya guardada.
- Nuevo `GET /api/health` comprueba si la tabla `profiles` está accesible sin revelar credenciales ni errores internos.
- La migración incorpora trigger de perfil cliente, actualización automática de `updated_at` y bucket privado de documentos con políticas por proyecto.
- No se incluye ninguna clave real. La migración sigue sin ejecutarse y el backend no se considera conectado hasta crear el proyecto Supabase dedicado y configurar sus variables en Vercel.
- El limitador por IP continúa siendo por instancia; debe sustituirse por uno compartido antes de producción.
