# Auditoría técnica · Codexia Systems v1.10.1

## Base revisada

- Archivo de entrada: `codexia-systems-web-v1.10.0-development.zip`.
- Versión actualizada de esta entrega: 1.10.1.
- Arquitectura: React 18, TypeScript, Vite, React Router, Supabase JS 2.119.2 y funciones serverless Vercel.
- Proyecto Supabase: `nzcqmuwxjuvfvcdcynjz`, organización y proyecto Codexia Systems.

## Cambios realizados

- Alineada la carpeta local de migraciones con las tres versiones que Supabase registra como aplicadas.
- Añadidos tipos TypeScript del esquema Supabase y tipado del cliente.
- Actualizada la información visible de contacto y privacidad para no afirmar que el CRM está pendiente de crearse.
- Actualizadas las guías de Supabase, bootstrap del primer propietario y primer Preview de Vercel.
- Añadidas pruebas automatizadas de validación, honeypot, rate limit, escritura CRM y endpoint de salud.
- Versionado del paquete actualizado a 1.10.1.

## Verificaciones ejecutadas

- 14 pruebas Node.js superadas (`node --test`).
- `node --check` superado para `api/contact.js`, `api/health.js` y `api/admin/users.js`.
- 19 archivos TypeScript/TSX pasaron la transpilación sintáctica sin errores; esto no sustituye el chequeo completo de tipos.
- JSON de `package.json`, `vercel.json`, `tsconfig.json`, `tsconfig.app.json` y `tsconfig.node.json` validado.
- XML de `public/sitemap.xml` validado.
- ZIP de entrada íntegro antes de modificarlo.
- Supabase: proyecto `ACTIVE_HEALTHY`, seis tablas públicas con RLS, 21 políticas públicas, permisos de RPC restringidos, bucket privado y tres migraciones remotas.

## Pendiente / no afirmado como verificado

- No se pudo descargar pnpm desde `registry.npmjs.org`: error DNS `EAI_AGAIN`.
- No se generó `pnpm-lock.yaml`.
- No se ejecutó `pnpm build` ni una compilación TypeScript completa con dependencias instaladas.
- El usuario propietario inicial ya existe, su correo está confirmado y `app_metadata.role` / `profiles.role` están sincronizados como `owner`. El login desde la web queda pendiente del Preview y de sus variables públicas.
- No se probaron login desde la web, recuperación, invitaciones, SMTP, RLS con dos clientes reales, Storage autenticado ni rate limit concurrente.
- No se configuraron variables de Vercel, no se creó deployment Preview y no se publicó en producción.

## Estado de seguridad observado en Supabase

- `profiles`, `leads`, `projects`, `project_updates`, `project_documents` y `activity_log`: RLS habilitado.
- 21 políticas en el esquema público.
- `private.contact_rate_limits`: RLS habilitado; `anon` y `authenticated` sin permisos de tabla. El advisor lo marca como RLS sin políticas, un aviso informativo e intencional para esta tabla privada.
- `public.consume_contact_rate_limit`: `EXECUTE` concedido a `service_role`, denegado a `anon` y `authenticated`.
- `project-documents`: bucket privado de 10 MB.
- El aviso del advisor sobre la tabla privada sin políticas RLS es informativo e intencional: los roles públicos no tienen acceso y el backend privilegiado es el único consumidor.

## Revisión de advisors (2026-11-24)

- Salud: sin avisos.
- Seguridad: aviso informativo de la tabla privada sin políticas RLS (acceso público revocado) y advertencia de que la protección contra contraseñas filtradas está desactivada. Esta última debe habilitarse en Supabase Auth antes de producción.
- Rendimiento: nueve índices aparecen como no utilizados; el proyecto está recién creado y no tiene tráfico representativo. No eliminarlos ahora. Reevaluar después de recopilar uso real.

## Decisión

La entrega queda preparada para subir a GitHub y crear un primer Preview cuando el propietario lo decida, pero no se considera producción ni build validado. La siguiente barrera técnica es instalar dependencias, generar el lockfile y ejecutar la compilación completa.
