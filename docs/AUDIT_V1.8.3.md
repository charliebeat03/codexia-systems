# Auditoría de desarrollo · Codexia Systems v1.8.3

## Fuente
- ZIP de entrada: `codexia-systems-web-v1.8.2-development.zip` adjuntado en esta conversación.
- Versión de salida: `1.8.3`.
- Se conservó la estructura y el código de la v1.8.2; esta actualización se limita a configurar los perfiles sociales confirmados y actualizar documentación.

## Perfiles oficiales configurados
- Instagram: `https://www.instagram.com/charlie___beast_03/` (se normalizó quitando el parámetro de seguimiento `avpt`).
- Facebook: `https://www.facebook.com/carlosalejandro.arciamiranda`.
- GitHub: `https://github.com/charliebeat03`.
- LinkedIn y YouTube siguen opcionales; no se han inventado direcciones.

## Contacto y footer
- Se conserva el footer corporativo compartido en las páginas y la página de contacto existente.
- Se conservan los formularios de contacto y presupuesto y su endpoint `POST /api/contact`.
- El endpoint sigue enviando mediante Resend cuando se configuran las credenciales. No persiste solicitudes en Supabase todavía.

## Comprobaciones
- `package.json` declara la versión `1.8.3`.
- Se verificaron los destinos HTTPS configurados en el footer.
- Se verificó la sintaxis del endpoint con `node --check`.
- No se ejecutó compilación completa porque `pnpm` y las dependencias del proyecto no están instaladas en este entorno.
- No se creó ni conectó Supabase, no se configuró Resend, no se subió a GitHub ni se desplegó en Vercel.
- KODI, modelos 3D, visor y dependencias asociadas siguen excluidos.

## Pendientes relevantes antes de GitHub
- Instalar dependencias con pnpm y generar/confirmar `pnpm-lock.yaml`.
- Completar revisión visual y funcional de todas las rutas y formularios.
- Revisar la migración SQL y las políticas RLS con pruebas reales antes de integrar backend.
- Resolver configuración de Resend y persistencia CRM cuando se cree el proyecto Supabase independiente.
- Revisar secretos, `.gitignore`, accesibilidad, responsive, SEO y build de producción.
