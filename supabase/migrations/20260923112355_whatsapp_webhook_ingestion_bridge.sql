-- Bridge the live WhatsApp Cloud API webhook to the CRM schema.
-- This is additive because whatsapp_messages already belongs to the CRM model.

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS sender text,
  ADD COLUMN IF NOT EXISTS message_type text,
  ADD COLUMN IF NOT EXISTS raw_payload jsonb;

UPDATE public.whatsapp_messages
SET sender = CASE WHEN direction = 'in' THEN 'client' ELSE 'human' END
WHERE sender IS NULL;

UPDATE public.whatsapp_messages
SET message_type = 'text'
WHERE message_type IS NULL;

ALTER TABLE public.whatsapp_messages
  ALTER COLUMN sender SET DEFAULT 'human',
  ALTER COLUMN sender SET NOT NULL,
  ALTER COLUMN message_type SET DEFAULT 'text',
  ALTER COLUMN message_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'whatsapp_messages_sender_check'
      AND conrelid = 'public.whatsapp_messages'::regclass
  ) THEN
    ALTER TABLE public.whatsapp_messages
      ADD CONSTRAINT whatsapp_messages_sender_check
      CHECK (sender IN ('client', 'ai', 'human', 'system'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS whatsapp_messages_lead_created_idx
  ON public.whatsapp_messages (lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS leads_whatsapp_phone_digits_idx
  ON public.leads ((regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g')));

CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_id text NOT NULL UNIQUE,
  phone text NOT NULL,
  display_name text,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  last_synced_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_contacts_phone_check CHECK (phone ~ '^[1-9][0-9]{9,14}$')
);

ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'whatsapp_contacts'
      AND policyname = 'whatsapp_contacts_team_read'
  ) THEN
    CREATE POLICY whatsapp_contacts_team_read
      ON public.whatsapp_contacts
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
      ));
  END IF;
END
$$;

GRANT SELECT ON public.whatsapp_contacts TO authenticated;
GRANT ALL ON public.whatsapp_contacts TO service_role;

CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_events (
  event_hash text PRIMARY KEY,
  event_type text NOT NULL,
  business_account_id text,
  phone_number_id text,
  payload jsonb NOT NULL,
  processing_status text NOT NULL DEFAULT 'received',
  attempt_count integer NOT NULL DEFAULT 1,
  processing_error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT whatsapp_webhook_events_processing_status_check
    CHECK (processing_status IN ('received', 'processed', 'ignored', 'failed')),
  CONSTRAINT whatsapp_webhook_events_attempt_count_check CHECK (attempt_count > 0)
);

ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'whatsapp_webhook_events'
      AND policyname = 'whatsapp_webhook_events_team_read'
  ) THEN
    CREATE POLICY whatsapp_webhook_events_team_read
      ON public.whatsapp_webhook_events
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
      ));
  END IF;
END
$$;

GRANT SELECT ON public.whatsapp_webhook_events TO authenticated;
GRANT ALL ON public.whatsapp_webhook_events TO service_role;

CREATE OR REPLACE FUNCTION public.gm_whatsapp_ingest_contact(
  p_phone text,
  p_name text,
  p_raw_payload jsonb,
  p_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_phone text;
  v_lead uuid;
  v_contact uuid;
BEGIN
  v_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  IF length(v_phone) IN (10, 11) THEN
    v_phone := '55' || v_phone;
  END IF;
  IF v_phone !~ '^[1-9][0-9]{9,14}$' THEN
    RAISE EXCEPTION 'Invalid WhatsApp contact phone';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_phone, 0));

  SELECT l.id INTO v_lead
  FROM public.leads l
  WHERE CASE
    WHEN length(regexp_replace(l.phone, '[^0-9]', '', 'g')) IN (10, 11)
      THEN '55' || regexp_replace(l.phone, '[^0-9]', '', 'g')
    ELSE regexp_replace(l.phone, '[^0-9]', '', 'g')
  END = v_phone
  ORDER BY l.created_at, l.id
  LIMIT 1;

  INSERT INTO public.whatsapp_contacts
    (wa_id, phone, display_name, lead_id, last_synced_at, raw_payload)
  VALUES
    (v_phone, v_phone, nullif(trim(coalesce(p_name, '')), ''), v_lead, coalesce(p_at, now()), p_raw_payload)
  ON CONFLICT (wa_id) DO UPDATE SET
    display_name = coalesce(nullif(trim(EXCLUDED.display_name), ''), public.whatsapp_contacts.display_name),
    lead_id = coalesce(EXCLUDED.lead_id, public.whatsapp_contacts.lead_id),
    last_synced_at = greatest(coalesce(public.whatsapp_contacts.last_synced_at, EXCLUDED.last_synced_at), EXCLUDED.last_synced_at),
    raw_payload = coalesce(EXCLUDED.raw_payload, public.whatsapp_contacts.raw_payload),
    updated_at = now()
  RETURNING id INTO v_contact;

  RETURN v_contact;
END;
$function$;

CREATE OR REPLACE FUNCTION public.gm_whatsapp_ingest_message(
  p_provider_id text,
  p_phone text,
  p_name text,
  p_direction text,
  p_body text,
  p_status text,
  p_message_type text,
  p_raw_payload jsonb,
  p_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_phone text;
  v_id uuid;
  v_lead uuid;
  v_contact uuid;
  v_body text;
BEGIN
  IF nullif(trim(coalesce(p_provider_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'WhatsApp message ID is required';
  END IF;
  IF p_direction NOT IN ('in', 'out') THEN
    RAISE EXCEPTION 'Invalid WhatsApp message direction';
  END IF;
  IF p_status NOT IN ('received','sending','accepted','sent','delivered','read','failed','unknown') THEN
    RAISE EXCEPTION 'Invalid WhatsApp message status';
  END IF;

  v_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  IF length(v_phone) IN (10, 11) THEN
    v_phone := '55' || v_phone;
  END IF;
  IF v_phone !~ '^[1-9][0-9]{9,14}$' THEN
    RAISE EXCEPTION 'Invalid WhatsApp message phone';
  END IF;

  v_body := coalesce(nullif(p_body, ''), '[Mensagem WhatsApp]');
  PERFORM pg_advisory_xact_lock(hashtextextended(v_phone, 0));

  SELECT id INTO v_id
  FROM public.whatsapp_messages
  WHERE provider_id = p_provider_id
  FOR UPDATE;

  IF v_id IS NOT NULL THEN
    UPDATE public.whatsapp_messages
    SET sender = CASE WHEN p_direction = 'in' THEN 'client' ELSE 'human' END,
        message_type = coalesce(nullif(p_message_type, ''), message_type),
        raw_payload = coalesce(p_raw_payload, raw_payload),
        body = CASE WHEN body IS NULL OR body = '' OR body = '[Mensagem WhatsApp]' THEN v_body ELSE body END,
        provider_at = greatest(coalesce(provider_at, p_at), coalesce(p_at, now()))
    WHERE id = v_id;
    RETURN v_id;
  END IF;

  SELECT l.id INTO v_lead
  FROM public.leads l
  WHERE CASE
    WHEN length(regexp_replace(l.phone, '[^0-9]', '', 'g')) IN (10, 11)
      THEN '55' || regexp_replace(l.phone, '[^0-9]', '', 'g')
    ELSE regexp_replace(l.phone, '[^0-9]', '', 'g')
  END = v_phone
  ORDER BY l.created_at, l.id
  LIMIT 1
  FOR UPDATE;

  IF v_lead IS NULL THEN
    INSERT INTO public.leads (name, phone, source, last_contact_at)
    VALUES (coalesce(nullif(trim(coalesce(p_name, '')), ''), v_phone), v_phone, 'whatsapp', coalesce(p_at, now()))
    RETURNING id INTO v_lead;
  ELSE
    UPDATE public.leads
    SET name = CASE
          WHEN (name IS NULL OR trim(name) = '' OR name = phone)
            AND nullif(trim(coalesce(p_name, '')), '') IS NOT NULL
            THEN trim(p_name)
          ELSE name
        END,
        last_contact_at = greatest(coalesce(last_contact_at, p_at), coalesce(p_at, now()))
    WHERE id = v_lead;
  END IF;

  v_contact := public.gm_whatsapp_ingest_contact(v_phone, p_name, p_raw_payload, p_at);
  UPDATE public.whatsapp_contacts SET lead_id = v_lead WHERE id = v_contact;

  INSERT INTO public.whatsapp_messages
    (provider_id, phone, direction, body, status, lead_id, provider_at,
     sender, message_type, raw_payload)
  VALUES
    (p_provider_id, v_phone, p_direction, v_body, p_status, v_lead, coalesce(p_at, now()),
     CASE WHEN p_direction = 'in' THEN 'client' ELSE 'human' END,
     coalesce(nullif(p_message_type, ''), 'text'), p_raw_payload)
  RETURNING id INTO v_id;

  INSERT INTO public.lead_interactions
    (lead_id, channel, direction, message, created_at, whatsapp_message_id)
  VALUES
    (v_lead, 'whatsapp', p_direction, v_body, coalesce(p_at, now()), v_id)
  ON CONFLICT (whatsapp_message_id) DO NOTHING;

  UPDATE public.leads
  SET last_contact_at = greatest(coalesce(last_contact_at, p_at), coalesce(p_at, now()))
  WHERE id = v_lead;

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.gm_whatsapp_ingest_contact(text, text, jsonb, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.gm_whatsapp_ingest_message(text, text, text, text, text, text, text, jsonb, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gm_whatsapp_ingest_contact(text, text, jsonb, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.gm_whatsapp_ingest_message(text, text, text, text, text, text, text, jsonb, timestamptz) TO service_role;
