# Backend Codexia Systems · v1.9.0

## Implementado en código

- `POST /api/contact`: valida ambos formularios, aplica honeypot, guarda el lead en `public.leads` y luego intenta notificar por Resend.
- La clave `SUPABASE_SECRET_KEY` (o la legacy `SUPABASE_SERVICE_ROLE_KEY` durante transición) se lee solo desde variables del servidor y se envía como `apikey`. Nunca debe tener prefijo `VITE_`.
- Si Resend no está configurado o falla, la consulta permanece guardada y la API devuelve un mensaje de registro exitoso con notificación pendiente.
- `GET /api/health`: comprueba acceso a `public.profiles` sin exponer URL, claves ni detalles internos.
- La migración crea perfiles cliente al registrar usuario, mantiene `updated_at`, y crea un bucket privado `project-documents`.

## Variables privadas para Vercel Preview

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `RESEND_API_KEY` (opcional hasta activar notificaciones)
- `CONTACT_TO_EMAIL` (opcional hasta activar notificaciones)
- `CONTACT_FROM_EMAIL` (opcional hasta activar notificaciones)

## Pasos de activación

1. Crear un proyecto Supabase independiente para Codexia Systems. No usar `worldtree`.
2. Revisar el precio y plan antes de confirmar la creación.
3. Ejecutar la migración inicial completa una sola vez en ese proyecto nuevo.
4. Copiar Project URL y Secret API Key a Vercel Preview como variables privadas.
5. Desplegar Preview y comprobar `GET /api/health` devuelve `200` y `backend: connected`.
6. Enviar una consulta de prueba y comprobar que aparece en `public.leads`.
7. Probar roles owner, team y dos clientes distintos antes de activar Auth para usuarios reales.

## Límites conocidos

- El rate limit actual es best-effort por instancia Vercel, no distribuido.
- No se ha creado el proyecto Supabase, no se ha ejecutado SQL y no se han probado políticas en una base real.
- Login, recuperación de contraseña, panel administrativo y portal cliente aún no están construidos.
- El bucket limita archivos a 10 MiB y una lista inicial de tipos; validar requisitos de negocio antes de habilitar cargas.
