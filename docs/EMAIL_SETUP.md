# Configuración de correo de Codexia Systems

## Arquitectura

1. Invitaciones, recuperación de contraseña y cambios de correo: Supabase Auth mediante SMTP personalizado de Mailjet.
2. Consultas y solicitudes desde el formulario público: `POST /api/contact` guarda primero el lead en Supabase y después envía un aviso al equipo y una confirmación al visitante mediante Mailjet Send API v3.1.

## Mailjet

El remitente debe estar validado y activo en Mailjet. El dominio ya tiene registros de verificación, SPF y DKIM configurados. No publiques un segundo SPF independiente.

## Variables privadas en Vercel

Configurar para Preview y Production:

| Variable | Valor |
|---|---|
| `MAILJET_API_KEY` | API Key pública de Mailjet |
| `MAILJET_SECRET_KEY` | Secret Key privada de Mailjet |
| `CONTACT_FROM_EMAIL` | `Codexia Systems <contact@codexiasystems.dpdns.org>` |
| `CONTACT_TO_EMAIL` | Dirección Gmail del propietario, destinataria de nuevas consultas |
| `CONTACT_CC_EMAIL` | `contact@codexiasystems.dpdns.org`, segundo buzón que recibe cada solicitud |

No compartir claves en GitHub, código fuente ni conversaciones. Después de añadir o modificar variables, crear un nuevo deployment para que las funciones las reciban.

## Supabase Auth SMTP

En Supabase → Authentication → SMTP Settings, activar Custom SMTP:

| Campo | Valor |
|---|---|
| Sender email | `contact@codexiasystems.dpdns.org` |
| Sender name | `Codexia Systems` |
| Host | `in-v3.mailjet.com` |
| Port | `587` |
| Username | API Key de Mailjet |
| Password | Secret Key de Mailjet |

En Authentication → URL Configuration:
- Site URL: `https://codexiasystems.dpdns.org`
- Redirect URL: `https://codexiasystems.dpdns.org/**`

Mantener la confirmación de correo activada y auto-confirm desactivado.

## Seguridad del plan Free

La protección de contraseñas filtradas de Supabase requiere Pro o superior. No afirmar que está activada. Como mitigación sin coste, establecer mínimo 12 caracteres y exigir mayúsculas, minúsculas, números y símbolos.

## Pruebas

1. Verificar el envío desde el formulario público en Preview: se realizan tres envíos independientes: uno a Gmail (`CONTACT_TO_EMAIL`), otro a Emayler (`CONTACT_CC_EMAIL`) y la confirmación al visitante. Así, un rechazo de Gmail no impide que Emayler reciba su copia, ni al revés.
2. Revisar Mailjet Activity y los logs de Vercel.
3. Configurar SMTP Auth y probar invitación/recuperación solo con una cuenta controlada, sin tocar la cuenta propietaria ni borrar usuarios existentes.
4. No reenviar formularios antiguos para evitar duplicados.


## Diagnóstico de entregas

La API informa por separado el resultado del aviso a Gmail y a Emayler. Un estado `sent` significa que Mailjet aceptó el mensaje, no que el proveedor del destinatario lo haya colocado en la bandeja de entrada. Para confirmar entrega o detectar rebotes, revisar Mailjet → Statistics / Email Activity y comprobar el evento de cada destinatario (sent, delivered, blocked, bounced o spam). En Gmail revisar también Spam, Todos y las pestañas Promociones/Notificaciones. No reenviar una solicitud real solo para probar sin confirmar primero si el mensaje anterior fue aceptado.
