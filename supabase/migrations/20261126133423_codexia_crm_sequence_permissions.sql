-- Keep generated quote numbering available only to signed-in application roles.
revoke all on sequence public.crm_quotes_quote_number_seq from anon, public;
grant usage, select on sequence public.crm_quotes_quote_number_seq to authenticated;
