create table if not exists public.landing_page_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('page_view', 'booking_request', 'cta_click', 'whatsapp_click')),
  page_path text not null check (char_length(page_path) between 1 and 200),
  cta_name text check (cta_name is null or char_length(cta_name) <= 64),
  created_at timestamptz not null default now()
);

create index if not exists landing_page_events_created_type_idx
  on public.landing_page_events (created_at desc, event_type);

alter table public.landing_page_events enable row level security;
revoke all on public.landing_page_events from anon, authenticated;
grant select on public.landing_page_events to authenticated;
drop policy if exists "Signed-in users can read landing metrics" on public.landing_page_events;
create policy "Signed-in users can read landing metrics"
  on public.landing_page_events for select to authenticated using (true);
