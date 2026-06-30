-- Integrations table (real CRUD replacing mock)
CREATE TABLE public.app_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'disconnected',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_integrations TO authenticated;
GRANT ALL ON public.app_integrations TO service_role;

ALTER TABLE public.app_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view integrations"
  ON public.app_integrations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can insert integrations"
  ON public.app_integrations FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update integrations"
  ON public.app_integrations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete integrations"
  ON public.app_integrations FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_app_integrations_updated_at
BEFORE UPDATE ON public.app_integrations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Appointments: track reminders to avoid double-sending
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_status text NOT NULL DEFAULT 'pending';

-- Seed default integrations
INSERT INTO public.app_integrations (provider, name, category, description, status) VALUES
  ('evolution_whatsapp', 'WhatsApp (Evolution API)', 'messaging', 'Conexão via WhatsApp Web usando Evolution API self-hosted', 'disconnected'),
  ('meta_ads', 'Meta Ads', 'ads', 'Campanhas e leads do Facebook e Instagram Ads', 'disconnected'),
  ('google_ads', 'Google Ads', 'ads', 'Campanhas e conversões do Google Ads', 'disconnected'),
  ('ga4', 'Google Analytics 4', 'analytics', 'Eventos e funis do site', 'disconnected'),
  ('meta_pixel', 'Meta Pixel', 'analytics', 'Pixel de conversão da Meta', 'disconnected');

-- Enable pg_cron and pg_net for scheduled reminders
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;