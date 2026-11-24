# Auditoría técnica · Codexia Systems v1.8.1

## Base revisada
Se tomó como fuente el ZIP `codexia-systems-web-v1.8-development.zip`. Esta revisión no reconstruye el sitio desde versiones anteriores.

## Hallazgos

### Corregidos en esta actualización
- Documentación principal y checklist ahora identifican correctamente el estado de desarrollo v1.8.1.
- Se aclaró que `POST /api/contact` envía mediante Resend, pero aún no persiste los leads en Supabase.
- Se documentó que el rate limiting actual es local a la instancia y no es una defensa persistente de producción.
- Se aclaró que `project_documents` almacena metadatos, no los archivos, y que falta el bucket privado con sus políticas.
- Las políticas de inserción de `project_updates`, `project_documents` y `activity_log` ahora vinculan el autor/actor al usuario autenticado para evitar suplantación desde clientes autenticados.
- Se eliminó un archivo temporal vacío `src/components.tmp`.

### Pendientes que requieren integración o validación externa
- Instalar dependencias y generar `pnpm-lock.yaml`.
- Ejecutar compilación completa con `pnpm build`.
- Crear un proyecto Supabase dedicado a Codexia y revisar el plan/costo antes de confirmarlo.
- Aplicar la migración y probar RLS con roles y clientes separados.
- Definir el alta automática de perfiles y la asignación inicial del owner.
- Crear Storage privado y probar las políticas de archivos.
- Conectar el endpoint a `leads` desde el servidor, sin exponer credenciales privilegiadas.
- Configurar Resend con un remitente verificado y realizar un envío real.
- Sustituir el rate limiting en memoria por una solución persistente antes de producción.

## Pruebas ejecutadas en esta revisión
- `node --check api/contact.js`: correcto.
- Parseo JSON de `package.json` y `vercel.json`: correcto.
- Parseo XML de `public/sitemap.xml`: correcto.
- Transpilación sintáctica TypeScript/TSX de 13 archivos: correcta.
- Comparación de opciones de servicio de ambos formularios con la lista permitida por el endpoint: correcta.
- Pruebas smoke del endpoint: método no permitido, honeypot, falta de configuración y envío simulado exitoso: correctas.
- Integridad del ZIP de origen y ausencia de archivos KODI/3D: comprobadas.

## Limitación de entorno
No se pudo ejecutar la compilación completa. pnpm no está instalado y Corepack no pudo descargarlo del registro npm por un fallo de conexión. La transpilación sintáctica no sustituye `tsc -b` ni el build real de Vite.

## Servicios externos
No se creó ni modificó ningún proyecto Supabase. No se configuró Resend, GitHub ni Vercel. No se desplegó el sitio.
