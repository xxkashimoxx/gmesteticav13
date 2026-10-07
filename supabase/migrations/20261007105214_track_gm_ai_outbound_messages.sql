alter table public.gm_ai_reply_jobs add column if not exists outbound_id text;
create unique index if not exists gm_ai_reply_jobs_outbound_id_uidx on public.gm_ai_reply_jobs (outbound_id) where outbound_id is not null;
