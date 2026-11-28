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

1. Verificar el envío desde el formulario público en Preview: el aviso interno debe llegar tanto a Gmail (`CONTACT_TO_EMAIL`) como a Emayler (`CONTACT_CC_EMAIL`), y la confirmación al visitante.
2. Revisar Mailjet Activity y los logs de Vercel.
3. Configurar SMTP Auth y probar invitación/recuperación solo con una cuenta controlada, sin tocar la cuenta propietaria ni borrar usuarios existentes.
4. No reenviar formularios antiguos para evitar duplicados.
