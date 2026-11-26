-- Only admin and owner may change the commercial state or CRM linkage of incoming leads.
drop policy if exists leads_staff_update on public.leads;
drop policy if exists leads_admin_update on public.leads;
create policy leads_admin_update on public.leads
for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
