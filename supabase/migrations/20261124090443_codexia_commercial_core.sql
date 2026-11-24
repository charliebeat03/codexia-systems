-- Codexia Systems: base comercial segura.
-- Ejecutar únicamente en un proyecto Supabase NUEVO y dedicado a Codexia.
-- No ejecutar en World Tree Shop ni en otros proyectos existentes.

create schema if not exists private;

-- Rate limit persistente para el formulario público. Solo el backend con clave
-- secreta puede ejecutar la función de consumo; nunca se almacena la IP en claro.
create table if not exists private.contact_rate_limits (
  ip_hash text primary key check (ip_hash ~ '^[0-9a-f]{64}$'),
  last_request_at timestamptz not null,
  expires_at timestamptz not null
);

create index if not exists contact_rate_limits_expires_idx on private.contact_rate_limits(expires_at);
revoke all on table private.contact_rate_limits from public, anon, authenticated;
grant all on table private.contact_rate_limits to service_role;

create or replace function public.consume_contact_rate_limit(
  p_ip_hash text,
  p_now timestamptz default now(),
  p_cooldown_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  consumed boolean;
begin
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' or p_cooldown_seconds is null or p_cooldown_seconds < 1 or p_cooldown_seconds > 3600 then
    return false;
  end if;

  insert into private.contact_rate_limits (ip_hash, last_request_at, expires_at)
  values (p_ip_hash, p_now, p_now + make_interval(secs => p_cooldown_seconds))
  on conflict (ip_hash) do update
    set last_request_at = excluded.last_request_at,
        expires_at = excluded.expires_at
    where private.contact_rate_limits.expires_at <= p_now
  returning true into consumed;

  delete from private.contact_rate_limits
  where expires_at < p_now - interval '1 day';

  return coalesce(consumed, false);
end;
$$;

revoke all on function public.consume_contact_rate_limit(text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.consume_contact_rate_limit(text, timestamptz, integer) to service_role;
grant usage on schema private to service_role;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  display_name text not null default '',
  role text not null default 'client' check (role in ('owner','admin','team','client')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  organization text,
  service text not null,
  budget text,
  timing text,
  details text not null,
  features text,
  status text not null default 'new' check (status in ('new','reviewing','proposal','won','closed')),
  source text not null default 'website',
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles(id) on delete set null,
  name text not null,
  summary text not null default '',
  status text not null default 'planning' check (status in ('planning','active','paused','completed','archived')),
  progress smallint not null default 0 check (progress between 0 and 100),
  start_date date,
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  title text not null,
  body text not null,
  visibility text not null default 'client' check (visibility in ('internal','client')),
  created_at timestamptz not null default now()
);

create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  storage_path text not null,
  file_name text not null,
  content_type text,
  visibility text not null default 'client' check (visibility in ('internal','client')),
  created_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

create index if not exists leads_status_created_idx on public.leads(status, created_at desc);
create index if not exists projects_client_created_idx on public.projects(client_id, created_at desc);
create index if not exists updates_project_created_idx on public.project_updates(project_id, created_at desc);
create index if not exists documents_project_created_idx on public.project_documents(project_id, created_at desc);


-- Mantener updated_at de forma consistente en los registros editables.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger leads_set_updated_at
before update on public.leads
for each row execute function private.set_updated_at();

create trigger projects_set_updated_at
before update on public.projects
for each row execute function private.set_updated_at();

-- Todo usuario nuevo recibe un perfil de cliente. El rol de autorización real
-- continúa viviendo exclusivamente en auth.users.raw_app_meta_data / app_metadata.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    'client'
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = case when public.profiles.display_name = '' then excluded.display_name else public.profiles.display_name end;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created_codexia
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Mantener el correo del perfil sincronizado si cambia desde Auth.
create or replace function private.sync_user_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set email = coalesce(new.email, '')
  where id = new.id;
  return new;
end;
$$;

revoke all on function private.sync_user_profile_email() from public, anon, authenticated;
create trigger on_auth_user_email_changed_codexia
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function private.sync_user_profile_email();

-- Roles de autorización solo desde app_metadata, nunca user_metadata editable por el usuario.
create or replace function private.is_staff()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') in ('owner','admin','team'), false);
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') in ('owner','admin'), false);
$$;

alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.projects enable row level security;
alter table public.project_updates enable row level security;
alter table public.project_documents enable row level security;
alter table public.activity_log enable row level security;

-- Perfiles: cada usuario ve el suyo; equipo autorizado ve los perfiles necesarios.
create policy "profiles_read_self_or_staff" on public.profiles
for select to authenticated
using (id = (select auth.uid()) or (select private.is_staff()));

create policy "profiles_admin_update" on public.profiles
for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "profiles_insert_admin_only" on public.profiles
for insert to authenticated
with check ((select private.is_admin()));

-- Leads: solo el equipo. El formulario público debe insertar mediante API server-side validada.
create policy "leads_staff_read" on public.leads
for select to authenticated using ((select private.is_staff()));
create policy "leads_staff_insert" on public.leads
for insert to authenticated with check ((select private.is_staff()));
create policy "leads_staff_update" on public.leads
for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "leads_admin_delete" on public.leads
for delete to authenticated using ((select private.is_admin()));

-- Proyectos: equipo gestiona; clientes solo consultan los suyos.
create policy "projects_staff_or_owner_read" on public.projects
for select to authenticated
using ((select private.is_staff()) or client_id = (select auth.uid()));
create policy "projects_staff_insert" on public.projects
for insert to authenticated with check ((select private.is_staff()));
create policy "projects_staff_update" on public.projects
for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "projects_admin_delete" on public.projects
for delete to authenticated using ((select private.is_admin()));

create policy "updates_staff_or_client_read" on public.project_updates
for select to authenticated
using (
  (select private.is_staff()) or (
    visibility = 'client' and exists (
      select 1 from public.projects p
      where p.id = project_id and p.client_id = (select auth.uid())
    )
  )
);
create policy "updates_staff_insert" on public.project_updates
for insert to authenticated with check ((select private.is_staff()) and author_id = (select auth.uid()));
create policy "updates_staff_update" on public.project_updates
for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "updates_admin_delete" on public.project_updates
for delete to authenticated using ((select private.is_admin()));

create policy "documents_staff_or_client_read" on public.project_documents
for select to authenticated
using (
  (select private.is_staff()) or (
    visibility = 'client' and exists (
      select 1 from public.projects p
      where p.id = project_id and p.client_id = (select auth.uid())
    )
  )
);
create policy "documents_staff_insert" on public.project_documents
for insert to authenticated with check ((select private.is_staff()) and uploaded_by = (select auth.uid()));
create policy "documents_staff_update" on public.project_documents
for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "documents_admin_delete" on public.project_documents
for delete to authenticated using ((select private.is_admin()));

create policy "activity_staff_read" on public.activity_log
for select to authenticated using ((select private.is_staff()));
create policy "activity_staff_insert" on public.activity_log
for insert to authenticated with check ((select private.is_staff()) and (actor_id is null or actor_id = (select auth.uid())));


-- Bucket privado para documentos de proyectos. Los objetos se guardan bajo
-- <project_id>/<nombre-archivo>; los clientes solo descargan documentos
-- registrados en project_documents con visibility='client'.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-documents',
  'project-documents',
  false,
  10485760,
  array['application/pdf','image/jpeg','image/png','image/webp','text/plain','application/zip']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "project_documents_storage_read"
on storage.objects for select to authenticated
using (
  bucket_id = 'project-documents'
  and (
    (select private.is_staff())
    or exists (
      select 1
      from public.project_documents d
      join public.projects p on p.id = d.project_id
      where d.storage_path = name
        and d.visibility = 'client'
        and p.client_id = (select auth.uid())
    )
  )
);

create policy "project_documents_storage_staff_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'project-documents'
  and (select private.is_staff())
  and exists (
    select 1 from public.projects p
    where p.id::text = split_part(name, '/', 1)
  )
);

create policy "project_documents_storage_staff_update"
on storage.objects for update to authenticated
using (bucket_id = 'project-documents' and (select private.is_staff()))
with check (bucket_id = 'project-documents' and (select private.is_staff()));

create policy "project_documents_storage_admin_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'project-documents' and (select private.is_admin()));

-- Permite revertir una carga propia si falla el registro de metadatos.
create policy "project_documents_storage_staff_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'project-documents'
  and (select private.is_staff())
  and owner_id = (select auth.uid())::text
);

-- Tablas no se exponen automáticamente en proyectos recientes: conceder solo a authenticated.
grant usage on schema private to authenticated;
revoke all on function private.is_staff() from public, anon;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_staff() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.leads to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.project_updates to authenticated;
grant select, insert, update, delete on public.project_documents to authenticated;
grant select, insert on public.activity_log to authenticated;
grant usage, select on sequence public.activity_log_id_seq to authenticated;
-- El backend usa la clave secreta solo desde funciones server-side.
grant select, insert, update, delete on public.profiles, public.leads, public.projects, public.project_updates, public.project_documents, public.activity_log to service_role;
grant usage, select on sequence public.activity_log_id_seq to service_role;
revoke all on public.profiles, public.leads, public.projects, public.project_updates, public.project_documents, public.activity_log from anon;

-- Crear el primer usuario owner manualmente desde un entorno administrativo confiable:
-- actualizar auth.users.raw_app_meta_data.role = 'owner' usando Supabase Dashboard / Admin API.
-- Nunca permitir que el navegador o user_metadata establezca este rol.
