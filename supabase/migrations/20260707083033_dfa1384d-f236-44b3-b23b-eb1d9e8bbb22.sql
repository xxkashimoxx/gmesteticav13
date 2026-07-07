
DO $$ BEGIN
  CREATE TYPE public.appointment_status AS ENUM (
    'scheduled','confirmed','arrived','in_progress','completed','paid','no_show','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS status public.appointment_status NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

DO $$ BEGIN
  CREATE TYPE public.lead_stage AS ENUM (
    'new','contacted','interested','evaluation_scheduled','attended','won','lost'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS stage public.lead_stage NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.clinic_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  clinic_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  whatsapp_number TEXT NOT NULL DEFAULT '',
  working_hours JSONB NOT NULL DEFAULT '{"mon":{"start":"09:00","end":"18:00","enabled":true},"tue":{"start":"09:00","end":"18:00","enabled":true},"wed":{"start":"09:00","end":"18:00","enabled":true},"thu":{"start":"09:00","end":"18:00","enabled":true},"fri":{"start":"09:00","end":"18:00","enabled":true},"sat":{"start":"09:00","end":"13:00","enabled":true},"sun":{"start":"09:00","end":"13:00","enabled":false}}'::jsonb,
  slot_duration_min INT NOT NULL DEFAULT 60,
  slot_buffer_min INT NOT NULL DEFAULT 0,
  wa_templates JSONB NOT NULL DEFAULT '{}'::jsonb,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_settings TO authenticated;
GRANT ALL ON public.clinic_settings TO service_role;
ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff and admin view clinic settings"
  ON public.clinic_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Admin manages own clinic settings"
  ON public.clinic_settings FOR ALL TO authenticated
  USING (auth.uid() = owner_id AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = owner_id AND public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_clinic_settings_updated
  BEFORE UPDATE ON public.clinic_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.patient_anamnesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_anamnesis_lead ON public.patient_anamnesis(lead_id, version DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_anamnesis TO authenticated;
GRANT ALL ON public.patient_anamnesis TO service_role;
ALTER TABLE public.patient_anamnesis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin and staff manage anamnesis"
  ON public.patient_anamnesis FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE TRIGGER trg_anamnesis_updated
  BEFORE UPDATE ON public.patient_anamnesis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.clinical_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  note TEXT NOT NULL DEFAULT '',
  products_used JSONB NOT NULL DEFAULT '[]'::jsonb,
  professional TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notes_appointment ON public.clinical_notes(appointment_id);
CREATE INDEX IF NOT EXISTS idx_notes_lead ON public.clinical_notes(lead_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_notes TO authenticated;
GRANT ALL ON public.clinical_notes TO service_role;
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin and staff manage clinical notes"
  ON public.clinical_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE TRIGGER trg_notes_updated
  BEFORE UPDATE ON public.clinical_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.patient_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  session_label TEXT,
  kind TEXT NOT NULL DEFAULT 'before' CHECK (kind IN ('before','after','progress')),
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_photos_lead ON public.patient_photos(lead_id, taken_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_photos TO authenticated;
GRANT ALL ON public.patient_photos TO service_role;
ALTER TABLE public.patient_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin and staff manage patient photos"
  ON public.patient_photos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
