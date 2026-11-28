-- Refine CRM RLS to avoid overlapping permissive policies and index all CRM foreign keys.
create index if not exists crm_contacts_created_by_idx on public.crm_contacts(created_by);
create index if not exists crm_opportunities_assigned_to_idx on public.crm_opportunities(assigned_to);
create index if not exists crm_opportunities_created_by_idx on public.crm_opportunities(created_by);
create index if not exists crm_opportunities_lead_id_idx on public.crm_opportunities(lead_id);
create index if not exists crm_opportunities_project_id_idx on public.crm_opportunities(project_id);
create index if not exists crm_activities_created_by_idx on public.crm_activities(created_by);
create index if not exists crm_activities_opportunity_id_idx on public.crm_activities(opportunity_id);
create index if not exists crm_activities_project_id_idx on public.crm_activities(project_id);
create index if not exists crm_tasks_contact_id_idx on public.crm_tasks(contact_id);
create index if not exists crm_tasks_created_by_idx on public.crm_tasks(created_by);
create index if not exists crm_tasks_opportunity_id_idx on public.crm_tasks(opportunity_id);
create index if not exists crm_tasks_project_id_idx on public.crm_tasks(project_id);
create index if not exists crm_quotes_created_by_idx on public.crm_quotes(created_by);
create index if not exists crm_quotes_opportunity_id_idx on public.crm_quotes(opportunity_id);
create index if not exists crm_quote_items_service_id_idx on public.crm_quote_items(service_id);

-- Replace broad FOR ALL policies with operation-specific policies.
do $$
declare t text;
begin
 foreach t in array array['crm_contacts','crm_opportunities','crm_activities','crm_tasks','crm_quotes'] loop
  execute format('drop policy if exists %I on public.%I',t||'_admin_write',t);
  execute format('drop policy if exists %I on public.%I',t||'_admin_insert',t);
  execute format('drop policy if exists %I on public.%I',t||'_admin_update',t);
  execute format('drop policy if exists %I on public.%I',t||'_admin_delete',t);
  execute format('create policy %I on public.%I for insert to authenticated with check ((select private.is_admin()))',t||'_admin_insert',t);
  execute format('create policy %I on public.%I for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',t||'_admin_update',t);
  execute format('create policy %I on public.%I for delete to authenticated using ((select private.is_admin()))',t||'_admin_delete',t);
 end loop;
end $$;

drop policy if exists crm_service_catalog_owner_write on public.crm_service_catalog;
drop policy if exists crm_service_catalog_owner_insert on public.crm_service_catalog;
drop policy if exists crm_service_catalog_owner_update on public.crm_service_catalog;
drop policy if exists crm_service_catalog_owner_delete on public.crm_service_catalog;
create policy crm_service_catalog_owner_insert on public.crm_service_catalog for insert to authenticated with check ((select private.is_owner()));
create policy crm_service_catalog_owner_update on public.crm_service_catalog for update to authenticated using ((select private.is_owner())) with check ((select private.is_owner()));
create policy crm_service_catalog_owner_delete on public.crm_service_catalog for delete to authenticated using ((select private.is_owner()));

drop policy if exists crm_quote_items_admin_write on public.crm_quote_items;
drop policy if exists crm_quote_items_admin_insert on public.crm_quote_items;
drop policy if exists crm_quote_items_admin_update on public.crm_quote_items;
drop policy if exists crm_quote_items_admin_delete on public.crm_quote_items;
drop policy if exists crm_quote_items_staff_read on public.crm_quote_items;
create policy crm_quote_items_staff_read on public.crm_quote_items for select to authenticated
using ((select private.is_staff()) and exists (select 1 from public.crm_quotes q where q.id=crm_quote_items.quote_id));
create policy crm_quote_items_admin_insert on public.crm_quote_items for insert to authenticated
with check ((select private.is_admin()) and exists (select 1 from public.crm_quotes q where q.id=crm_quote_items.quote_id));
create policy crm_quote_items_admin_update on public.crm_quote_items for update to authenticated
using ((select private.is_admin()) and exists (select 1 from public.crm_quotes q where q.id=crm_quote_items.quote_id))
with check ((select private.is_admin()) and exists (select 1 from public.crm_quotes q where q.id=crm_quote_items.quote_id));
create policy crm_quote_items_admin_delete on public.crm_quote_items for delete to authenticated
using ((select private.is_admin()) and exists (select 1 from public.crm_quotes q where q.id=crm_quote_items.quote_id));