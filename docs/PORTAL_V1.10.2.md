# Plataforma privada Codexia Systems · v1.10.2

## Qué incorpora

- `/acceso`: inicio de sesión por correo y contraseña, recuperación y establecimiento de contraseña tras invitación.
- `/panel`: panel compartido que adapta sus secciones según `auth.users.app_metadata.role`.
- Panel de equipo: consultas, proyectos, asignación de clientes, progreso, actualizaciones y documentos privados.
- Portal de cliente: consulta únicamente proyectos asignados, actualizaciones visibles para clientes y documentos compartidos.
- Administración de usuarios: invitación de clientes/equipo y asignación de roles permitidos mediante `/api/admin/users`.
- Registro de actividad de acciones relevantes.
- Tipos TypeScript del esquema Supabase mantenidos en `src/lib/database.types.ts`.

## Roles

La autorización se basa exclusivamente en `auth.users.raw_app_meta_data.role`, expuesto en el JWT como `app_metadata.role`. Nunca se autoriza usando `user_metadata`, porque el usuario puede modificar esos metadatos.

| Rol | Capacidades |
|---|---|
| `owner` | Todas las capacidades; puede invitar y asignar administradores. |
| `admin` | Gestiona consultas, proyectos, usuarios cliente/equipo y documentos. No puede crear administradores ni propietarios. |
| `team` | Consulta el CRM, crea/actualiza proyectos, publica actualizaciones y carga documentos. |
| `client` | Consulta únicamente sus proyectos, actualizaciones visibles y documentos compartidos. |

La columna `profiles.role` es una copia descriptiva para la interfaz. Las políticas RLS consultan el `app_metadata.role` firmado en el JWT, que es la fuente de autorización.

## Proyecto Supabase y migraciones

El proyecto `Codexia Systems` ya está creado y activo en la organización `Codexia Systems`:

- Project ref: `nzcqmuwxjuvfvcdcynjz`
- Región: `us-east-1`
- PostgreSQL: 17

Migraciones remotas aplicadas:

1. `20261124090443_codexia_commercial_core`
2. `20261124090454_codexia_foreign_key_indexes`
3. `20261124091542_codexia_rate_limits_rls`

Los tres archivos correspondientes están en `supabase/migrations/`. La historia local se alineó con los identificadores remotos para evitar que la migración inicial aparezca como pendiente. No volver a ejecutar la migración base manualmente. Antes de cualquier `supabase db push`, verificar coincidencia local/remota con `supabase migration list`.

## Estado del propietario inicial

El propietario inicial ya fue creado en Supabase Authentication. En la última verificación, su correo aparecía confirmado y el rol `owner` estaba sincronizado en `auth.users.raw_app_meta_data.role` y `public.profiles.role`. No volver a ejecutar el SQL de bootstrap ni crear otra cuenta propietaria.

El propietario ya inició sesión correctamente desde el Preview. Su perfil muestra el nombre `Carlos` en `public.profiles.display_name` y en los metadatos de Auth; el rol `owner` permanece sincronizado en Auth y perfiles. La autorización del servidor y RLS se basan en `app_metadata.role`, nunca en `user_metadata`.

No se han creado proyectos ni cuentas cliente de prueba en la base real. Para validar la vista cliente habrá que invitar una cuenta de prueba y asignarle un proyecto; hacerlo solo cuando exista un plan de limpieza de esos datos.

## Variables de entorno en Vercel

**Públicas, necesarias para activar login y portal:**

- `VITE_SUPABASE_URL=https://nzcqmuwxjuvfvcdcynjz.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (clave `sb_publishable_...` del proyecto)

**Privadas, necesarias para CRM y funciones serverless:**

- `SUPABASE_URL=https://nzcqmuwxjuvfvcdcynjz.supabase.co`
- `SUPABASE_SECRET_KEY` (clave `sb_secret_...`, solo servidor)
- `PUBLIC_SITE_URL` (URL HTTPS del Preview para enlaces de invitación)

**Opcionales:**

- `RESEND_API_KEY`
- `CONTACT_TO_EMAIL`
- `CONTACT_FROM_EMAIL`

Nunca crear `VITE_SUPABASE_SECRET_KEY` ni guardar secretos en GitHub. Configurar las variables en el entorno Preview, no en Production mientras se realizan pruebas. El propietario realizará la configuración de autenticación.

## API de administración

`POST /api/admin/users` invita una cuenta. Cuerpo: `{ "email": "...", "displayName": "...", "role": "client|team|admin" }`. El rol `admin` solo puede asignarlo `owner`.

`PATCH /api/admin/users` cambia un rol. Cuerpo: `{ "userId": "UUID", "role": "client|team|admin" }`. Requiere `Authorization: Bearer <access_token>`. La función valida el token con Auth, comprueba `app_metadata.role` en servidor y usa la clave secreta solo desde Vercel.

No existe endpoint público para autoasignarse roles. Los propietarios no se crean ni promueven desde la interfaz.

## Storage

- Bucket `project-documents`, privado, máximo 10 MB.
- Tipos permitidos: PDF, JPEG, PNG, WebP, texto plano y ZIP.
- Ruta: `<project_id>/<uuid>-<nombre-seguro>`.
- La fila de `project_documents` es el registro de visibilidad que habilita la descarga del cliente.
- Los enlaces firmados duran 60 segundos.
- Si la carga del objeto funciona pero el registro de metadatos falla, la interfaz intenta eliminar el objeto para no dejarlo huérfano.

## Rate limiting del formulario público

La tabla privada `private.contact_rate_limits` tiene RLS habilitado, sin permisos para `anon` ni `authenticated`. La función `public.consume_contact_rate_limit` solo concede ejecución a `service_role`. `POST /api/contact` calcula un HMAC SHA-256 de la IP usando la clave secreta del proyecto, consulta la función y aplica un intervalo de 60 segundos. No almacena la IP en claro. Si el chequeo no está disponible, el endpoint falla de forma cerrada.

## Pruebas pendientes

- Probar login, recuperación e invitaciones con SMTP desde el Preview.
- Probar aislamiento entre dos cuentas cliente distintas.
- Probar subida, visibilidad y descarga de documentos con roles distintos.
- Probar el rate limit con solicitudes concurrentes contra Preview.
- Ejecutar build y pruebas de navegador tras instalar dependencias.
