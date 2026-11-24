-- Índices de las claves foráneas para mantener eficientes las relaciones.
create index if not exists activity_log_actor_id_idx
  on public.activity_log(actor_id);

create index if not exists leads_assigned_to_idx
  on public.leads(assigned_to);

create index if not exists project_documents_uploaded_by_idx
  on public.project_documents(uploaded_by);

create index if not exists project_updates_author_id_idx
  on public.project_updates(author_id);
