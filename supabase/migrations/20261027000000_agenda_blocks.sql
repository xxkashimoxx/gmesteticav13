-- Bloqueios de agenda: folgas, feriados, viagens, cursos.
-- Dia inteiro (start_time/end_time nulos) ou um intervalo no dia.
-- A página pública de disponibilidade nunca expõe o motivo (reason).
create table if not exists public.agenda_blocks (
  id uuid primary key default gen_random_uuid(),
  block_date date not null,
  start_time time,
  end_time time,
  reason text check (reason is null or char_length(reason) <= 200),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint agenda_blocks_time_pair check (
    (start_time is null and end_time is null)
    or (start_time is not null and end_time is not null and end_time > start_time)
  )
);

create index if not exists agenda_blocks_date_idx on public.agenda_blocks (block_date);

grant select, insert, delete on public.agenda_blocks to authenticated;
grant all on public.agenda_blocks to service_role;

alter table public.agenda_blocks enable row level security;

create policy "Admin and staff view agenda blocks" on public.agenda_blocks
  for select to authenticated
  using (private.has_role(auth.uid(), 'admin'::app_role) or private.has_role(auth.uid(), 'staff'::app_role));

create policy "Admin and staff insert agenda blocks" on public.agenda_blocks
  for insert to authenticated
  with check (private.has_role(auth.uid(), 'admin'::app_role) or private.has_role(auth.uid(), 'staff'::app_role));

create policy "Admin and staff delete agenda blocks" on public.agenda_blocks
  for delete to authenticated
  using (private.has_role(auth.uid(), 'admin'::app_role) or private.has_role(auth.uid(), 'staff'::app_role));
