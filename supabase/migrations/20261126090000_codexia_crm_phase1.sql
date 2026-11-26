-- Codexia Systems CRM foundation
-- Roles are sourced only from auth.app_metadata via the existing private helpers.

create or replace function private.is_owner()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner', false);
$$;

grant execute on function private.is_owner() to authenticated;

create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  contact_type text not null check (contact_type in ('company','small_business','individual')),
  display_name text not null check (length(btrim(display_name)) between 2 and 160),
  organization_name text,
  email text,
  phone text,
  country text,
  city text,
  address text,
  tax_id text,
  notes text,
  source text not null default 'manual',
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_contacts_email_length check (email is null or length(email) <= 254),
  constraint crm_contacts_optional_business_fields check (
    contact_type = 'company'
    or (organization_name is null or length(btrim(organization_name)) > 0)
  )
);

alter table public.leads add column if not exists contact_id uuid references public.crm_contacts(id) on delete set null;

create table if not exists public.crm_opportunities (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.crm_contacts(id) on delete restrict,
  lead_id uuid references public.leads(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  title text not null check (length(btrim(title)) between 2 and 180),
  description text,
  stage text not null default 'new' check (stage in ('new','contacted','qualified','proposal','negotiation','won','lost')),
  estimated_value numeric(12,2) check (estimated_value is null or estimated_value >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  probability integer not null default 10 check (probability between 0 and 100),
  expected_close_date date,
  lost_reason text,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.crm_contacts(id) on delete cascade,
  opportunity_id uuid references public.crm_opportunities(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  activity_type text not null check (activity_type in ('call','email','meeting','message','note','status_change','other')),
  subject text not null check (length(btrim(subject)) between 1 and 180),
  body text,
  occurred_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint crm_activities_parent_check check (
    num_nonnulls(contact_id, opportunity_id, project_id) >= 1
  )
);

create table if not exists public.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.crm_contacts(id) on delete cascade,
  opportunity_id uuid references public.crm_opportunities(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null check (length(btrim(title)) between 2 and 180),
  description text,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'pending' check (status in ('pending','in_progress','completed','cancelled')),
  due_at timestamptz,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_tasks_parent_check check (
    num_nonnulls(contact_id, opportunity_id, project_id) >= 1
  )
);

create table if not exists public.crm_service_catalog (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null check (length(btrim(name)) between 2 and 160),
  description text,
  min_price numeric(12,2) check (min_price is null or min_price >= 0),
  max_price numeric(12,2) check (max_price is null or max_price >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  pricing_note text,
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_service_catalog_price_range check (
    min_price is null or max_price is null or max_price >= min_price
  )
);

create table if not exists public.crm_quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number bigint generated by default as identity unique,
  contact_id uuid not null references public.crm_contacts(id) on delete restrict,
  opportunity_id uuid references public.crm_opportunities(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','sent','accepted','rejected','expired','cancelled')),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  valid_until date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_quotes_discount_check check (discount <= subtotal),
  constraint crm_quotes_total_check check (total = subtotal - discount)
);

create table if not exists public.crm_quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.crm_quotes(id) on delete cascade,
  service_id uuid references public.crm_service_catalog(id) on delete set null,
  description text not null check (length(btrim(description)) between 1 and 240),
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  line_total numeric(14,2) generated always as (round(quantity * unit_price, 2)) stored,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

create index if not exists crm_contacts_name_idx on public.crm_contacts using gin (to_tsvector('simple', display_name));
create index if not exists crm_contacts_email_idx on public.crm_contacts (lower(email)) where email is not null;
create index if not exists crm_contacts_assigned_idx on public.crm_contacts (assigned_to);
create index if not exists crm_opportunities_stage_created_idx on public.crm_opportunities (stage, created_at desc);
create index if not exists crm_opportunities_contact_idx on public.crm_opportunities (contact_id);
create index if not exists crm_activities_contact_date_idx on public.crm_activities (contact_id, occurred_at desc);
create index if not exists crm_tasks_status_due_idx on public.crm_tasks (status, due_at);
create index if not exists crm_tasks_assigned_due_idx on public.crm_tasks (assigned_to, due_at);
create index if not exists crm_quotes_contact_created_idx on public.crm_quotes (contact_id, created_at desc);
create index if not exists crm_quote_items_quote_idx on public.crm_quote_items (quote_id, sort_order);
create index if not exists leads_contact_id_idx on public.leads (contact_id) where contact_id is not null;

drop trigger if exists crm_contacts_set_updated_at on public.crm_contacts;
create trigger crm_contacts_set_updated_at before update on public.crm_contacts for each row execute function private.set_updated_at();
drop trigger if exists crm_opportunities_set_updated_at on public.crm_opportunities;
create trigger crm_opportunities_set_updated_at before update on public.crm_opportunities for each row execute function private.set_updated_at();
drop trigger if exists crm_tasks_set_updated_at on public.crm_tasks;
create trigger crm_tasks_set_updated_at before update on public.crm_tasks for each row execute function private.set_updated_at();
drop trigger if exists crm_service_catalog_set_updated_at on public.crm_service_catalog;
create trigger crm_service_catalog_set_updated_at before update on public.crm_service_catalog for each row execute function private.set_updated_at();
drop trigger if exists crm_quotes_set_updated_at on public.crm_quotes;
create trigger crm_quotes_set_updated_at before update on public.crm_quotes for each row execute function private.set_updated_at();

alter table public.crm_contacts enable row level security;
alter table public.crm_opportunities enable row level security;
alter table public.crm_activities enable row level security;
alter table public.crm_tasks enable row level security;
alter table public.crm_service_catalog enable row level security;
alter table public.crm_quotes enable row level security;
alter table public.crm_quote_items enable row level security;

revoke all on public.crm_contacts, public.crm_opportunities, public.crm_activities, public.crm_tasks, public.crm_service_catalog, public.crm_quotes, public.crm_quote_items from anon;
grant select, insert, update, delete on public.crm_contacts, public.crm_opportunities, public.crm_activities, public.crm_tasks, public.crm_service_catalog, public.crm_quotes, public.crm_quote_items to authenticated;
grant usage, select on sequence public.crm_quotes_quote_number_seq to authenticated;

do $$
declare t text;
begin
  foreach t in array array['crm_contacts','crm_opportunities','crm_activities','crm_tasks','crm_quotes','crm_quote_items'] loop
    execute format('drop policy if exists %I on public.%I', t || '_staff_read', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select private.is_staff()))', t || '_staff_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_write', t);
    execute format('create policy %I on public.%I for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))', t || '_admin_write', t);
  end loop;
end $$;

drop policy if exists crm_service_catalog_staff_read on public.crm_service_catalog;
create policy crm_service_catalog_staff_read on public.crm_service_catalog for select to authenticated using ((select private.is_staff()));
drop policy if exists crm_service_catalog_owner_write on public.crm_service_catalog;
create policy crm_service_catalog_owner_write on public.crm_service_catalog for all to authenticated using ((select private.is_owner())) with check ((select private.is_owner()));

-- Quote line access is always inherited from the parent quote. A user cannot
-- attach a line to a quote they cannot access.
drop policy if exists crm_quote_items_staff_read on public.crm_quote_items;
create policy crm_quote_items_staff_read on public.crm_quote_items for select to authenticated
using (exists (select 1 from public.crm_quotes q where q.id = crm_quote_items.quote_id));
drop policy if exists crm_quote_items_admin_write on public.crm_quote_items;
create policy crm_quote_items_admin_write on public.crm_quote_items for all to authenticated
using (exists (select 1 from public.crm_quotes q where q.id = crm_quote_items.quote_id and private.is_admin()))
with check (exists (select 1 from public.crm_quotes q where q.id = crm_quote_items.quote_id and private.is_admin()));

-- Keep the private project-document bucket private and scope every object policy
-- to a real project ID stored as the first path segment.
drop policy if exists project_documents_storage_read on storage.objects;
create policy project_documents_storage_read on storage.objects for select to authenticated
using (
  bucket_id = 'project-documents'
  and (
    (select private.is_staff())
    or exists (
      select 1
      from public.project_documents d
      join public.projects p on p.id = d.project_id
      where d.storage_path = storage.objects.name
        and d.project_id::text = split_part(storage.objects.name, '/', 1)
        and d.visibility = 'client'
        and p.client_id = (select auth.uid())
    )
  )
);

drop policy if exists project_documents_storage_staff_insert on storage.objects;
create policy project_documents_storage_staff_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'project-documents'
  and (select private.is_staff())
  and exists (
    select 1 from public.projects p
    where p.id::text = split_part(storage.objects.name, '/', 1)
  )
);

drop policy if exists project_documents_storage_staff_update on storage.objects;
create policy project_documents_storage_staff_update on storage.objects for update to authenticated
using (
  bucket_id = 'project-documents'
  and (select private.is_staff())
  and exists (select 1 from public.projects p where p.id::text = split_part(storage.objects.name, '/', 1))
)
with check (
  bucket_id = 'project-documents'
  and (select private.is_staff())
  and exists (select 1 from public.projects p where p.id::text = split_part(storage.objects.name, '/', 1))
);

drop policy if exists project_documents_storage_admin_delete on storage.objects;
create policy project_documents_storage_admin_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'project-documents'
  and (select private.is_admin())
  and exists (select 1 from public.projects p where p.id::text = split_part(storage.objects.name, '/', 1))
);

drop policy if exists project_documents_storage_staff_delete_own on storage.objects;
create policy project_documents_storage_staff_delete_own on storage.objects for delete to authenticated
using (
  bucket_id = 'project-documents'
  and (select private.is_staff())
  and owner_id = (select auth.uid())::text
  and exists (select 1 from public.projects p where p.id::text = split_part(storage.objects.name, '/', 1))
);

insert into public.crm_service_catalog (code, name, description, min_price, max_price, currency, pricing_note, sort_order)
values (
  'web-static-basic',
  'Sitio web estático básico',
  'Sitio informativo sencillo, adaptable a móviles y con estructura de páginas acordada.',
  30, 50, 'USD',
  'Referencia inicial. El precio final depende del alcance, contenido, páginas, idiomas, dominio, hosting e integraciones.',
  10
)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  min_price = excluded.min_price,
  max_price = excluded.max_price,
  currency = excluded.currency,
  pricing_note = excluded.pricing_note,
  sort_order = excluded.sort_order;

comment on table public.crm_contacts is 'CRM contacts. Company-specific and fiscal fields are optional; individuals and small businesses are first-class contacts.';
comment on table public.crm_service_catalog is 'Owner-managed editable service and pricing reference catalog. Prices are estimates, not mandatory client budgets.';
comment on table public.crm_quote_items is 'Quote line items; access is inherited from the parent quote.';
