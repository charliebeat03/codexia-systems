# Estado del propietario inicial de Codexia

El usuario propietario inicial ya fue creado en el proyecto Supabase `Codexia Systems`. La última verificación confirmó correo verificado y rol `owner` tanto en `auth.users.raw_app_meta_data` como en `public.profiles.role`.

**No repetir el SQL de bootstrap ni crear un segundo propietario.**

Cuando esté disponible el primer Preview de Vercel y se configuren las variables públicas de Supabase, iniciar sesión en `/acceso` para renovar el JWT y comprobar el panel. La autorización usa `app_metadata.role`; nunca se debe confiar en `user_metadata` ni permitir que el navegador asigne roles.
