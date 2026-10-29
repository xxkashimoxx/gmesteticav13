CREATE TABLE IF NOT EXISTS public.appointment_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text NOT NULL,
  procedure_interest text,
  preferred_period text,
  notes text,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'offered', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  offered_at timestamptz,
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS appointment_waitlist_status_created_idx
  ON public.appointment_waitlist (status, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_waitlist TO authenticated;
GRANT ALL ON public.appointment_waitlist TO service_role;
ALTER TABLE public.appointment_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic team reads waitlist" ON public.appointment_waitlist
  FOR SELECT TO authenticated
  USING (private.has_role((select auth.uid()), 'admin'::app_role) OR private.has_role((select auth.uid()), 'staff'::app_role));
CREATE POLICY "Clinic team adds waitlist" ON public.appointment_waitlist
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role) OR private.has_role((select auth.uid()), 'staff'::app_role));
CREATE POLICY "Clinic team updates waitlist" ON public.appointment_waitlist
  FOR UPDATE TO authenticated
  USING (private.has_role((select auth.uid()), 'admin'::app_role) OR private.has_role((select auth.uid()), 'staff'::app_role))
  WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role) OR private.has_role((select auth.uid()), 'staff'::app_role));
