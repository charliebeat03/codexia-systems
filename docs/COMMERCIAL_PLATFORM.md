# Plataforma comercial de Codexia Systems · estado v1.10.1

## Alcance

La plataforma incluye CRM de solicitudes, cuentas con roles, proyectos, actualizaciones, documentos privados y registro de actividad. El código de autenticación, el panel y el portal están implementados. La base de datos dedicada ya existe y las tres migraciones están aplicadas y verificadas en Supabase.

## Proyecto Supabase activo

- Organización: Codexia Systems.
- Proyecto: Codexia Systems.
- Referencia: `nzcqmuwxjuvfvcdcynjz`.
- Región: `us-east-1`.
- Estado observado: `ACTIVE_HEALTHY`.
- PostgreSQL: 17.

Este proyecto es independiente de cualquier otro producto. No modificar bases de datos ajenas a Codexia.

## Modelo de datos

- `profiles`: correo, nombre y rol descriptivo vinculado a `auth.users`. La autorización real viene de `app_metadata.role`.
- `leads`: solicitudes entrantes y su ciclo comercial.
- `projects`: proyectos con un cliente principal, estado y progreso.
- `project_updates`: novedades internas o visibles al cliente.
- `project_documents`: metadatos de archivos guardados en Storage privado.
- `activity_log`: trazabilidad de operaciones relevantes.
- `private.contact_rate_limits`: hash HMAC para limitar solicitudes repetidas sin almacenar la IP en claro.

## Roles

- `owner`: control total y asignación de administradores.
- `admin`: gestión de CRM, proyectos, usuarios cliente/equipo y documentos.
- `team`: consulta CRM, gestiona proyectos, publica actualizaciones y carga documentos.
- `client`: solo consulta proyectos propios, actualizaciones visibles y documentos compartidos.

Los permisos RLS usan `auth.users.raw_app_meta_data.role` / JWT `app_metadata.role`. Nunca usar `user_metadata` para autorizar.

## Migraciones aplicadas y alineación del repositorio

Las tres entradas remotas verificadas son:

| Versión remota | Nombre |
|---|---|
| `20261124090443` | `codexia_commercial_core` |
| `20261124090454` | `codexia_foreign_key_indexes` |
| `20261124091542` | `codexia_rate_limits_rls` |

La carpeta `supabase/migrations/` contiene ahora archivos con esas mismas versiones y nombres para mantener sincronizada la historia local con la remota. La migración base fue renombrada en el repositorio para reflejar el identificador que Supabase registró al aplicarla. No volver a ejecutar SQL manualmente ni recrear estas migraciones. Antes de usar `supabase db push`, comprobar primero que `supabase migration list` muestre coincidencia local/remota.

## Verificación observada en Supabase

- Proyecto activo y saludable.
- Seis tablas públicas con RLS habilitado.
- 21 políticas RLS públicas registradas.
- Tabla privada de rate limit con RLS habilitado y sin permisos para `anon` ni `authenticated`.
- `public.consume_contact_rate_limit` ejecutable por `service_role`, no por `anon` ni `authenticated`.
- Bucket `project-documents` privado, límite de 10 MB y tipos permitidos configurados.
- Las tablas están vacías: todavía no hay usuarios, perfiles, leads ni proyectos.
- El aviso `RLS Enabled No Policy` sobre `private.contact_rate_limits` es informativo e intencional: se bloqueó el acceso de roles públicos y solo el backend con `service_role` utiliza esa tabla.

## Seguridad

- El frontend usa únicamente publishable key.
- La secret key existe solo en funciones serverless y nunca en variables `VITE_*`.
- `POST /api/contact` valida formularios, guarda en `leads` y notifica mediante Resend por separado.
- El limitador persistente usa `public.consume_contact_rate_limit`, cuya ejecución se concede únicamente a `service_role`.
- `POST/PATCH /api/admin/users` verifica el JWT en servidor y limita la asignación de `admin` al propietario.
- El cliente solo puede leer proyectos propios y actualizaciones/documentos con visibilidad `client`.
- El bucket `project-documents` es privado y las descargas usan enlaces firmados temporales.
- Las rutas `/acceso` y `/panel` se marcan `noindex,nofollow`.

## Lo que queda pendiente

1. El propietario inicial ya está creado y verificado; su rol `owner` quedó sincronizado en Auth y `profiles`. No repetir el bootstrap.
2. Configurar las variables privadas del backend en Vercel Preview y comprobar `/api/health`.
3. Configurar las variables públicas de Supabase para activar login y portal. El propietario realizará este paso de autenticación.
4. Configurar SMTP de Supabase y, opcionalmente, Resend con dominio remitente verificado.
5. Probar invitaciones, recuperación, aislamiento entre dos clientes, carga/descarga de documentos y rate limit real.
6. Instalar dependencias, generar `pnpm-lock.yaml` y ejecutar el build completo. En este entorno el registro npm falla por DNS (`EAI_AGAIN`).

El estado del propietario inicial y la comprobación de acceso tras crear el Preview están documentados en `docs/PORTAL_V1.10.2.md`.
