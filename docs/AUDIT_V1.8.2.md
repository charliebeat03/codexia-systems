# Auditoría de desarrollo · Codexia Systems v1.8.2

## Base de trabajo
- Fuente: `codexia-systems-web-v1.8.1-development.zip` aportado en esta conversación.
- Versión del paquete actualizada a `1.8.2`.
- No se ha conectado Supabase, Resend, GitHub ni Vercel.
- No se ha realizado despliegue.
- KODI, recursos 3D, visor y dependencias asociadas siguen excluidos.

## Cambios de esta etapa
- Se centralizó el footer corporativo en `src/components/SiteShell.tsx`.
- El footer incluye exploración del sitio, ayuda/contacto, presupuesto y un bloque de redes sociales.
- Instagram, Facebook, LinkedIn, YouTube y GitHub se pueden configurar mediante variables `VITE_SOCIAL_*`.
- Solo se muestran enlaces sociales cuyo valor comience por HTTPS. No se inventaron perfiles ni nombres de usuario.
- Se unificó el footer en Inicio, páginas internas, contacto, presupuesto, portafolio, soporte, FAQ, recursos, detalles y 404.
- La página de contacto utiliza ahora la cabecera y el footer compartidos; se conservan formulario, consentimiento, validación, estado de envío y alternativa de copiar el resumen.
- Se añadió navegación móvil con botón accesible en la cabecera compartida para páginas internas.
- Se añadieron estilos responsive para el footer y el menú compartido.
- Se documentaron las variables sociales y las pruebas pendientes.

## Comprobaciones ejecutadas
- `node --check api/contact.js`: correcto.
- Transpilación sintáctica de TypeScript/TSX con TypeScript global: 13 archivos revisados sin errores de sintaxis.
- `package.json`: JSON válido y versión `1.8.2`.
- Archivos de documentación, variables y componentes comprobados.
- Revisión estática de la presencia de `SiteFooter` en rutas principales, detalles y página 404.

## Pendiente / limitaciones
- No hay `node_modules`, `pnpm` ni `pnpm-lock.yaml` en el entorno de trabajo.
- No se pudo completar `tsc -b` ni `vite build`: las dependencias del proyecto no están instaladas. El chequeo de TypeScript mostró errores por ausencia de módulos y tipos (`react`, `react-router-dom`, `lucide-react`, `vite`), no una compilación satisfactoria.
- Falta que el propietario confirme las URLs oficiales de Instagram y otras redes. Hasta entonces el footer muestra el aviso de perfiles pendientes, no enlaces ficticios.
- Falta revisar visualmente en navegador el menú y el footer en móviles/tablets.
- El formulario aún depende de la configuración de Resend y no guarda solicitudes en Supabase.
