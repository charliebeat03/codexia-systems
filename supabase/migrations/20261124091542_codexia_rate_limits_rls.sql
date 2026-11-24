-- La tabla privada solo puede ser utilizada por el backend con service_role.
alter table private.contact_rate_limits enable row level security;
revoke all on table private.contact_rate_limits from public, anon, authenticated;
grant all on table private.contact_rate_limits to service_role;
