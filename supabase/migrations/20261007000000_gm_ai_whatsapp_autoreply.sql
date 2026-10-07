-- GM WhatsApp AI: safe server-side configuration and idempotent reply tracking.
create table if not exists public.gm_ai_settings (
  id text primary key check (id = 'main'),
  auto_reply_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.gm_ai_settings (id, auto_reply_enabled)
values ('main', true)
on conflict (id) do nothing;

create table if not exists public.gm_ai_training_examples (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(question) between 1 and 2000),
  answer text not null check (char_length(answer) between 1 and 2000),
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists gm_ai_training_examples_recent_idx
  on public.gm_ai_training_examples (created_at desc) where active;

create table if not exists public.gm_ai_reply_jobs (
  provider_id text primary key,
  outbound_id text,
  phone text not null,
  status text not null check (status in ('processing','sent','handoff','skipped','failed')),
  reply text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists gm_ai_reply_jobs_outbound_id_uidx
  on public.gm_ai_reply_jobs (outbound_id) where outbound_id is not null;
create index if not exists gm_ai_reply_jobs_recent_idx
  on public.gm_ai_reply_jobs (created_at desc);

create table if not exists public.gm_ai_contact_modes (
  phone text primary key,
  ai_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.gm_ai_settings enable row level security;
alter table public.gm_ai_training_examples enable row level security;
alter table public.gm_ai_reply_jobs enable row level security;
alter table public.gm_ai_contact_modes enable row level security;
