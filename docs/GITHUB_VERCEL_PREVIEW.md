# Primera subida a GitHub y Preview de Vercel

## 1. Preparar el repositorio

1. Crear un repositorio para Codexia Systems Web.
2. Extraer el ZIP de desarrollo.
3. Entrar en `codexia-systems-web` y subir **su contenido** a la raíz del repositorio. No subir la carpeta contenedora como una carpeta anidada.
4. Comprobar que `package.json`, `index.html`, `src/`, `api/`, `public/`, `supabase/` y `vercel.json` queden en la raíz.
5. No subir `.env.local`, `.env` ni claves privadas. `.env.example` solo contiene nombres y valores ilustrativos.

## 2. Conectar GitHub con Vercel

1. Importar el repositorio GitHub en Vercel.
2. Framework Preset: Vite.
3. Root Directory: `./`.
4. Build Command: `pnpm build`.
5. Output Directory: `dist`.
6. Install Command: `pnpm install` o detección automática por `packageManager`.
7. Node.js: 22 o superior.
8. Crear un deployment **Preview**. No asignar todavía el dominio principal ni promover a Production.

## 3. Variables de entorno para Preview

**Backend privado, necesario para CRM y formularios:**

- `SUPABASE_URL=https://nzcqmuwxjuvfvcdcynjz.supabase.co`
- `SUPABASE_SECRET_KEY` (clave `sb_secret_...` del proyecto; nunca en el frontend)

**Autenticación del frontend, se configura cuando el propietario realice ese paso:**

- `VITE_SUPABASE_URL=https://nzcqmuwxjuvfvcdcynjz.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (clave `sb_publishable_...`)

**Invitaciones y correo:**

- `PUBLIC_SITE_URL` (URL HTTPS exacta del Preview)
- `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL` son opcionales para notificaciones de formularios.
- SMTP y las URLs de redirección permitidas se configuran en Supabase Auth antes de probar invitaciones y recuperación.

Nunca crear variables `VITE_SUPABASE_SECRET_KEY` ni subir claves privadas a GitHub. Las claves públicas son aptas para el navegador; las secret keys no.

## 4. Qué comprobar en el primer Preview

- Interfaz React/Vite, navegación, rutas directas y recarga de páginas.
- Recursos estáticos, favicon, SEO básico y footer.
- Funciones serverless `/api/contact`, `/api/health` y `/api/admin/users`.
- `GET /api/health` debe responder `200` con `backend: connected` cuando `SUPABASE_URL` y `SUPABASE_SECRET_KEY` estén bien configuradas y el backend pueda consultar las tablas.
- Formulario de contacto: confirmar que crea un registro en `public.leads`. Si Resend no está configurado, el lead debe conservarse y la interfaz debe indicar que la notificación por correo está pendiente.
- El usuario `owner` ya está creado y verificado en Supabase. Login y portal estarán activos cuando se configuren las variables públicas en Preview; no repetir el bootstrap.

## 5. Base de datos ya preparada

El proyecto Supabase `Codexia Systems` ya está activo y sus tres migraciones están aplicadas. Los archivos locales de `supabase/migrations/` coinciden con las versiones remotas. No volver a ejecutar el SQL inicial. Antes de utilizar la CLI, comprobar el estado con `supabase migration list` y no continuar si aparecen migraciones locales/remotas desalineadas.

## 6. Ciclo de correcciones

Cada corrección se sube como commit a GitHub. Vercel genera un nuevo Preview para cada cambio, permitiendo revisar antes de promover una versión a producción.

## 7. Avisos actuales de Supabase

La última revisión de advisors no detectó incidencias de salud. El aviso de RLS sin políticas en `private.contact_rate_limits` es intencional: `anon` y `authenticated` no tienen permisos sobre esa tabla y el backend usa la RPC restringida. Los índices marcados como no utilizados son esperables en una base recién creada y deben reevaluarse cuando haya tráfico real.

Permanece un aviso de seguridad: la protección contra contraseñas filtradas está desactivada. Antes de producción, habilitarla en Supabase Authentication → Password Security y volver a ejecutar la revisión de seguridad.

## 8. Antes de producción

- Revisar todas las rutas directas y recargas.
- Probar móvil, tablet y escritorio.
- Probar formularios con correo configurado y sin configurar.
- Probar autenticación, roles, invitaciones, recuperación y aislamiento de clientes.
- Confirmar identidad legal, canal de privacidad y conservación de consultas.
- Confirmar dominio y HTTPS.
- Obtener autorización expresa antes de promover a Production.
