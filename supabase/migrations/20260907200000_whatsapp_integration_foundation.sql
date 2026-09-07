create table if not exists public.whatsapp_contacts (
  id uuid primary key default gen_random_uuid(),
  wa_id text not null unique,
  phone text,
  display_name text,
  lead_id uuid references public.leads(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.whatsapp_contacts(id) on delete cascade,
  status text not null default 'open' check (status in ('open','human','closed')),
  ai_enabled boolean not null default true,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists whatsapp_one_active_conversation_per_contact
  on public.whatsapp_conversations(contact_id)
  where status in ('open','human');

create index if not exists whatsapp_conversations_last_message_idx
  on public.whatsapp_conversations(last_message_at desc);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  meta_message_id text unique,
  direction text not null check (direction in ('inbound','outbound')),
  sender text not null check (sender in ('client','ai','human','system')),
  message_type text not null default 'text',
  body text,
  status text,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_messages_conversation_idx
  on public.whatsapp_messages(conversation_id, created_at desc);

create table if not exists public.whatsapp_settings (
  id smallint primary key default 1 check (id = 1),
  auto_reply_enabled boolean not null default false,
  phone_number_id text,
  business_account_id text,
  api_version text not null default 'v23.0',
  handoff_keywords text[] not null default array['atendente','humano','pessoa','recepção','recepcao','falar com a doutora','falar com a dra'],
  updated_at timestamptz not null default now()
);

insert into public.whatsapp_settings (id, auto_reply_enabled)
values (1, false)
on conflict (id) do nothing;

alter table public.whatsapp_contacts enable row level security;
alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.whatsapp_settings enable row level security;

grant select, insert, update, delete on public.whatsapp_contacts to authenticated;
grant select, insert, update, delete on public.whatsapp_conversations to authenticated;
grant select, insert, update, delete on public.whatsapp_messages to authenticated;
grant select, update on public.whatsapp_settings to authenticated;

grant all on public.whatsapp_contacts to service_role;
grant all on public.whatsapp_conversations to service_role;
grant all on public.whatsapp_messages to service_role;
grant all on public.whatsapp_settings to service_role;

drop policy if exists "Admin and staff manage WhatsApp contacts" on public.whatsapp_contacts;
create policy "Admin and staff manage WhatsApp contacts"
  on public.whatsapp_contacts for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'));

drop policy if exists "Admin and staff manage WhatsApp conversations" on public.whatsapp_conversations;
create policy "Admin and staff manage WhatsApp conversations"
  on public.whatsapp_conversations for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'));

drop policy if exists "Admin and staff manage WhatsApp messages" on public.whatsapp_messages;
create policy "Admin and staff manage WhatsApp messages"
  on public.whatsapp_messages for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'));

drop policy if exists "Admin and staff view WhatsApp settings" on public.whatsapp_settings;
create policy "Admin and staff view WhatsApp settings"
  on public.whatsapp_settings for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'));

drop policy if exists "Admin manages WhatsApp settings" on public.whatsapp_settings;
create policy "Admin manages WhatsApp settings"
  on public.whatsapp_settings for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

comment on table public.whatsapp_contacts is 'Contatos recebidos pela API oficial do WhatsApp';
comment on table public.whatsapp_conversations is 'Conversas do WhatsApp e estado de handoff humano/IA';
comment on table public.whatsapp_messages is 'Historico de mensagens recebidas e enviadas pelo WhatsApp';
comment on table public.whatsapp_settings is 'Chaves nao secretas e controles operacionais da integracao WhatsApp';
