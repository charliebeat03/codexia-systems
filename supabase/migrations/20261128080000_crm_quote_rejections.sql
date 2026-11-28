alter table public.crm_quotes
  add column if not exists rejection_reason text,
  add column if not exists rejection_email_sent_at timestamptz;

alter table public.crm_quotes
  drop constraint if exists crm_quotes_rejection_reason_length;

alter table public.crm_quotes
  add constraint crm_quotes_rejection_reason_length
  check (rejection_reason is null or char_length(rejection_reason) between 8 and 1200);

alter table public.leads
  add column if not exists rejection_reason text,
  add column if not exists rejection_email_sent_at timestamptz;

alter table public.leads
  drop constraint if exists leads_rejection_reason_length;

alter table public.leads
  add constraint leads_rejection_reason_length
  check (rejection_reason is null or char_length(rejection_reason) between 8 and 1200);
