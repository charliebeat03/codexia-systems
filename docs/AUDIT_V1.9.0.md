# Auditoría técnica v1.9.0

## Resultado

Se añadió la primera capa funcional de backend CRM sin crear ni conectar todavía un proyecto Supabase real.

## Implementado

- `POST /api/contact` valida los formularios de contacto y presupuesto.
- Los leads se guardan primero en `public.leads` mediante la API REST de Supabase y una clave secreta exclusivamente server-side.
- Resend se ejecuta después del guardado. La falla o ausencia de correo no descarta el lead.
- `GET /api/health` verifica acceso a `public.profiles` sin revelar claves ni errores internos.
- La migración incluye perfil cliente automático al crear usuario, triggers `updated_at`, bucket privado de documentos y políticas de Storage por proyecto.
- La documentación y la política de privacidad reflejan el flujo propuesto y los pendientes de activación.

## Pruebas ejecutadas

- `node --check api/contact.js`: correcto.
- `node --check api/health.js`: correcto.
- Prueba simulada de guardado CRM: correcta.
- Prueba simulada de notificación Resend fallida después de guardar: la API conserva el registro y comunica notificación pendiente.
- Prueba simulada de fallo CRM: no devuelve éxito falso.
- Validación de campos y honeypot: correctas.
- Rate limit por instancia: prueba básica correcta.
- JSON de `package.json` y `vercel.json`: válidos.
- `public/sitemap.xml`: XML válido.
- ZIP final: integridad comprobada.

## No verificado / no conectado

- No existe todavía un proyecto Supabase dedicado conectado a esta aplicación.
- La migración SQL no se ha ejecutado contra PostgreSQL real ni se ha validado con `supabase db advisors`.
- No se han probado RLS ni Storage con usuarios reales.
- No se han configurado secretos de Supabase ni Resend en Vercel.
- No se ejecutó `pnpm install` ni `pnpm build`; pnpm no está disponible en este entorno y no se debe afirmar que la compilación está validada.
- No se creó ni publicó un repositorio GitHub ni un deployment Vercel.

## Riesgo pendiente

El rate limit sigue siendo por instancia y en memoria. Debe sustituirse por un mecanismo compartido antes de producción.
