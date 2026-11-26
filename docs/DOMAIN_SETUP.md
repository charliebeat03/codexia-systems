# Dominio público en DigitalPlat y Vercel

Dominio: `codexiasystems.dpdns.org`  
DNS autoritativo: `dns1.digitalplat.org` y `dns2.digitalplat.org`  
Proyecto Vercel: `codexia-systems`

El dominio ya está añadido al proyecto de Vercel, pero sigue pendiente de verificación DNS.

## Registros que debes añadir en DigitalPlat

En la zona DNS de `codexiasystems.dpdns.org`, añade:

| Tipo | Nombre / Host | Valor | TTL |
|---|---|---|---|
| A | `@` | `216.198.79.1` | 300 |
| A | `@` | `64.29.17.1` | 300 |
| TXT | `_vercel` | `vc-domain-verify=codexiasystems.dpdns.org,3c406141e4942914e5e3` | 300 |

Son los dos destinos IPv4 de prioridad principal que Vercel recomendó para este dominio, más el desafío TXT de propiedad.

**No elimines ni reemplaces los registros de correo existentes.** Deben permanecer:

- MX `@` → `10 mx1.emayler.com.`
- TXT SPF `@` → `v=spf1 include:spf.emayler.com ~all`
- TXT DMARC `_dmarc` → `v=DMARC1; p=none; rua=mailto:dmarc@emayler.com`
- CNAME `bounce` → `bounces.emayler.com.`
- CNAME DKIM `e202611._domainkey` → `e202611._domainkey.codexiasystems.dpdns.org.dkim.emayler.net.`
- TXT `emayler-verify` → `emayler-verify=a39f090beb16cf49b1be09cd95b7a832`
- CNAME `tienda` → `world-tree-shop.onrender.com.`

Los registros A en la raíz pueden coexistir con MX y TXT. No crees un CNAME en `@`, porque chocaría con los registros de correo. El subdominio `tienda` debe seguir apuntando a World Tree Shop.

## Después de guardar

1. Espera la propagación DNS.
2. En Vercel, vuelve a comprobar el dominio del proyecto. Debe pasar a verificado y recibir certificado HTTPS.
3. Abre `https://codexiasystems.dpdns.org` y comprueba inicio, acceso, contacto y presupuesto.
4. En Supabase → Authentication → URL Configuration, configura Site URL como `https://codexiasystems.dpdns.org` y añade `https://codexiasystems.dpdns.org/**` a Redirect URLs.

La variable privada de Vercel `PUBLIC_SITE_URL` ya se actualizó para Production y Preview a `https://codexiasystems.dpdns.org`. Los enlaces de invitación solo funcionarán cuando DNS y la URL de Supabase estén configurados.

## Producción

La URL del dominio se ha asociado al proyecto, pero el dominio no estará operativo hasta que Vercel detecte los registros DNS. El PR sigue abierto en borrador y el dominio no se ha publicado como una versión de producción confirmada. La promoción final se hará después de verificar dominio, correo y flujos de autenticación.
