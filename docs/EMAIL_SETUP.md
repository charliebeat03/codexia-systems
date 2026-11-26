# Configuración de correo de Codexia Systems

## Arquitectura

Codexia usa dos flujos de correo diferentes:

1. **Invitaciones, recuperación de contraseña y cambios de correo:** los envía Supabase Auth mediante su SMTP personalizado.
2. **Consultas y solicitudes de presupuesto:** el endpoint privado `POST /api/contact` guarda primero la solicitud en Supabase y después envía dos mensajes mediante la API de SMTP2GO: aviso interno y confirmación al visitante.

No se utiliza Resend.

## Proveedor recomendado: SMTP2GO Free

El plan gratuito publicado ofrece 1.000 correos al mes y un máximo de 200 al día. El proveedor permite verificar un dominio remitente o una dirección individual. La verificación individual sirve como alternativa si el DNS del dominio gratuito no permite completar todos los registros. La verificación de dominio con SPF/DKIM es preferible para la entregabilidad.

1. Crear una cuenta en https://www.smtp2go.com/ y elegir Free.
2. Abrir **Sending → Verified Senders → Single Sender Emails** y añadir la dirección remitente que realmente exista y puedas recibir, por ejemplo `contact@codexiasystems.dpdns.org`.
3. Abrir el buzón de esa dirección y completar el enlace de verificación enviado por SMTP2GO.
4. En **Sending → API Keys**, crear una clave API con permiso para enviar correo.
5. En **Sending → SMTP Users**, crear un usuario SMTP independiente para Supabase Auth y guardar su usuario y contraseña.

La dirección `contact@codexiasystems.dpdns.org` solo debe utilizarse si el buzón ya existe y puede recibir mensajes. No inventes una dirección remitente ni uses una que no puedas verificar.

## Variables privadas en Vercel

En el proyecto `codexia-systems`, añade estas variables para **Production** y **Preview**:

| Variable | Valor |
|---|---|
| `SMTP2GO_API_KEY` | API key creada en Sending → API Keys |
| `CONTACT_FROM_EMAIL` | Dirección verificada, por ejemplo `Codexia Systems <contact@codexiasystems.dpdns.org>` |
| `CONTACT_TO_EMAIL` | Buzón donde el propietario recibirá las nuevas consultas |

Las variables `SUPABASE_URL` y `SUPABASE_SECRET_KEY` ya son privadas y no deben exponerse como `VITE_*`. No publiques ninguna clave en GitHub ni la pegues en el código fuente.

Después de añadir o modificar variables en Vercel, crear un nuevo deployment para que las funciones las reciban.

## Configurar Supabase Auth para invitaciones y recuperación

En el proyecto Supabase **Codexia Systems**:

1. Ir a **Authentication → SMTP Settings**.
2. Activar **Enable Custom SMTP**.
3. Configurar:

| Campo | Valor |
|---|---|
| Sender email | La misma dirección verificada en SMTP2GO |
| Sender name | `Codexia Systems` |
| Host | `mail.smtp2go.com` |
| Port | `587` |
| Username | Usuario creado en Sending → SMTP Users |
| Password | Contraseña de ese usuario SMTP |

4. Guardar los cambios.
5. En **Authentication → URL Configuration**, establecer **Site URL** en `https://codexiasystems.dpdns.org` y añadir como Redirect URL permitida `https://codexiasystems.dpdns.org/**`.
6. Mantener la confirmación de correo activada y no habilitar auto-confirm para usuarios nuevos.
7. Revisar **Authentication → Rate Limits**. El SMTP personalizado de Supabase comienza con límites de protección; no aumentarlos sin necesidad.

El SMTP predeterminado de Supabase solo permite entregar a direcciones autorizadas de la organización y tiene un límite muy bajo; no sirve como correo de producción para invitar a clientes externos.

### Seguridad de contraseñas en el plan Free

La protección de contraseñas filtradas de Supabase (HaveIBeenPwned) está disponible solo en Pro o superior, así que el aviso del Security Advisor no puede eliminarse en el plan Free sin cambiar de plan. No se debe fingir que está activada. Como mitigación sin coste, en **Authentication → Sign In / Providers → Email** establece una longitud mínima de 12 caracteres y exige mayúsculas, minúsculas, números y símbolos; conserva la confirmación de correo activada.

## DNS y entregabilidad

SMTP2GO ofrece verificación de remitente individual, que no requiere cambiar los MX actuales. Si más adelante verificas el dominio completo, copia los registros SPF/DKIM exactos que muestre SMTP2GO. El dominio ya tiene SPF de Emayler: no publiques un segundo SPF independiente. Debe combinarse en un único registro TXT si el proveedor requiere añadir otro include. No elimines ni sustituyas los MX de Emayler ni el CNAME `tienda` de World Tree Shop.

Emayler sirve actualmente como buzón receptor, pero su documentación indica que no ofrece acceso SMTP/IMAP para clientes y que sus API keys no pueden enviar correo desde aplicaciones. Por eso no puede reemplazar el proveedor de envío automático.

## Prueba final

Cuando se completen las variables y SMTP:

1. Invitar una cuenta de prueba controlada desde **Panel → Usuarios**.
2. Confirmar que llega la invitación, abrir el enlace y establecer la contraseña.
3. Usar recuperación de contraseña en esa misma cuenta y comprobar el enlace.
4. Enviar una nueva consulta desde el formulario público y comprobar el aviso interno y la confirmación al visitante.
5. Revisar la actividad de SMTP2GO y los logs de Auth si algún mensaje no llega.

No usar la cuenta propietaria real como cuenta de prueba ni borrar usuarios existentes. No reenviar formularios antiguos para evitar duplicados.
