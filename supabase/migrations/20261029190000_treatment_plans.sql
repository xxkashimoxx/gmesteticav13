CREATE TABLE IF NOT EXISTS public.treatment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  chief_concern text NOT NULL,
  patient_goal text NOT NULL,
  assessment_summary text NOT NULL,
  proposed_care text NOT NULL,
  session_plan text,
  guidance text,
  follow_up_on date,
  follow_up_completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, version)
);

CREATE INDEX IF NOT EXISTS treatment_plans_follow_up_idx
  ON public.treatment_plans (follow_up_on)
  WHERE follow_up_on IS NOT NULL AND follow_up_completed_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.treatment_plans TO authenticated;
GRANT ALL ON public.treatment_plans TO service_role;
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic team reads treatment plans" ON public.treatment_plans
  FOR SELECT TO authenticated
  USING (private.has_role((select auth.uid()), 'admin'::app_role) OR private.has_role((select auth.uid()), 'staff'::app_role));
CREATE POLICY "Clinic team creates treatment plans" ON public.treatment_plans
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role) OR private.has_role((select auth.uid()), 'staff'::app_role));
CREATE POLICY "Clinic team marks plan follow up" ON public.treatment_plans
  FOR UPDATE TO authenticated
  USING (private.has_role((select auth.uid()), 'admin'::app_role) OR private.has_role((select auth.uid()), 'staff'::app_role))
  WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role) OR private.has_role((select auth.uid()), 'staff'::app_role));
