# Auditoría de preparación v1.8.4

## Cambios
- Página `/privacidad` con descripción del flujo actual de datos.
- Consentimientos de `/contacto` y `/presupuesto` enlazan a la información de privacidad.
- Footer incluye acceso a privacidad.
- Sitemap incorpora la ruta.
- `vercel.json` define `pnpm build`, `dist` y un fallback SPA que no captura `/api/`.
- `package.json` declara `pnpm@9.15.5` y Node >=20.

## Pendientes antes de producción
- Confirmar datos legales del responsable y canal de privacidad.
- Definir plazos de conservación y proceso operativo de solicitudes de privacidad.
- Conectar GitHub a Vercel y revisar Preview.
- Añadir variables privadas de Resend cuando se disponga de dominio remitente verificado y buzón receptor.
- Supabase permanece desconectado; no ejecutar todavía la migración.

## Validación local de esta edición
- Revisión estructural de archivos y rutas.
- `package.json`, `vercel.json` y sitemap validados como JSON/XML.
- Compilación Vite completa no ejecutada: Corepack no pudo descargar pnpm por error DNS `EAI_AGAIN` al registro npm. La primera compilación real se delegará a Vercel Preview, según el flujo acordado.
