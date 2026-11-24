# Archivos principales cambiados · v1.10.2

## Nuevos
- `src/lib/database.types.ts`: tipos del esquema Supabase verificado.
- `supabase/migrations/20261124090454_codexia_foreign_key_indexes.sql`.
- `supabase/migrations/20261124091542_codexia_rate_limits_rls.sql`.
- `tests/contact.test.js` y `tests/health.test.js`.
- `docs/AUDIT_V1.10.2.md` y `docs/PORTAL_V1.10.2.md`.

## Actualizados
- `package.json`: versión 1.10.2 y scripts `test`, `check:api` y `verify`.
- `src/lib/supabase.ts`: cliente Supabase tipado con el esquema.
- `api/contact.js`: límite de tamaño y validación de estructura del cuerpo de solicitud.
- `api/health.js`: comprobación de `profiles` y `leads` con timeout.
- `src/pages/ContactPage.tsx` y `src/pages/PrivacyPage.tsx`: textos de CRM y proveedores actualizados.
- `supabase/migrations/20261124090443_codexia_commercial_core.sql`: nombre alineado con la versión remota registrada.
- `README.md`, `CHANGELOG.md`, `QA_CHECKLIST.md`, `docs/COMMERCIAL_PLATFORM.md`, `docs/GITHUB_VERCEL_PREVIEW.md` y `supabase/BOOTSTRAP_OWNER.md`.

## Verificaciones
- `npm run verify`: 14 pruebas superadas y sintaxis de los tres endpoints validada.
- 19 archivos TypeScript/TSX pasaron la transpilación sintáctica.
- JSON y sitemap XML validados.
- El build completo no se ejecutó: pnpm no pudo descargarse por error DNS `EAI_AGAIN`.

## No incluido
- Ninguna clave secreta ni archivo `.env` real.
- `pnpm-lock.yaml`, porque el registro de paquetes no estuvo accesible y no se fabricó un lockfile.
- `node_modules`, `dist`, cachés o archivos temporales.
- Ningún deployment, commit ni publicación en GitHub/Vercel.

- `api/admin/users.js`: validación de tipo y tamaño de cuerpo para la API administrativa.
- Documentación de estado de Auth, revisión de advisors y pasos para Preview corregida según la verificación real del proyecto Supabase.
