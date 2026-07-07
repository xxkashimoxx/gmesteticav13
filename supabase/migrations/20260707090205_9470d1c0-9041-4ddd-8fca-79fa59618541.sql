
-- 1) Remove extensão pg_net do schema public (não é usada por nenhum código do app)
DROP EXTENSION IF EXISTS pg_net;

-- 2) Cria schema privado (não exposto pela Data API)
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

-- 3) has_role em private (SECURITY DEFINER, chamada apenas por policies)
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;

-- 4) Recria policies usando private.has_role

-- procedures
DROP POLICY IF EXISTS "Admins can insert procedures" ON public.procedures;
CREATE POLICY "Admins can insert procedures" ON public.procedures
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update procedures" ON public.procedures;
CREATE POLICY "Admins can update procedures" ON public.procedures
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete procedures" ON public.procedures;
CREATE POLICY "Admins can delete procedures" ON public.procedures
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- leads
DROP POLICY IF EXISTS "Admin insert leads" ON public.leads;
CREATE POLICY "Admin insert leads" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin update leads" ON public.leads;
CREATE POLICY "Admin update leads" ON public.leads
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin delete leads" ON public.leads;
CREATE POLICY "Admin delete leads" ON public.leads
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- lead_interactions
DROP POLICY IF EXISTS "Admin insert interactions" ON public.lead_interactions;
CREATE POLICY "Admin insert interactions" ON public.lead_interactions
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin update interactions" ON public.lead_interactions;
CREATE POLICY "Admin update interactions" ON public.lead_interactions
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin delete interactions" ON public.lead_interactions;
CREATE POLICY "Admin delete interactions" ON public.lead_interactions
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- appointments
DROP POLICY IF EXISTS "Admin insert appointments" ON public.appointments;
CREATE POLICY "Admin insert appointments" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin update appointments" ON public.appointments;
CREATE POLICY "Admin update appointments" ON public.appointments
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin delete appointments" ON public.appointments;
CREATE POLICY "Admin delete appointments" ON public.appointments
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- procedure_sales
DROP POLICY IF EXISTS "Admin insert sales" ON public.procedure_sales;
CREATE POLICY "Admin insert sales" ON public.procedure_sales
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin update sales" ON public.procedure_sales;
CREATE POLICY "Admin update sales" ON public.procedure_sales
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin delete sales" ON public.procedure_sales;
CREATE POLICY "Admin delete sales" ON public.procedure_sales
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- app_integrations
DROP POLICY IF EXISTS "Admin can insert integrations" ON public.app_integrations;
CREATE POLICY "Admin can insert integrations" ON public.app_integrations
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin can update integrations" ON public.app_integrations;
CREATE POLICY "Admin can update integrations" ON public.app_integrations
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin can delete integrations" ON public.app_integrations;
CREATE POLICY "Admin can delete integrations" ON public.app_integrations
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- clinic_settings
DROP POLICY IF EXISTS "Staff and admin view clinic settings" ON public.clinic_settings;
CREATE POLICY "Staff and admin view clinic settings" ON public.clinic_settings
  FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'staff'::public.app_role)
  );

DROP POLICY IF EXISTS "Admin manages own clinic settings" ON public.clinic_settings;
CREATE POLICY "Admin manages own clinic settings" ON public.clinic_settings
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id AND private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (auth.uid() = owner_id AND private.has_role(auth.uid(), 'admin'::public.app_role));

-- patient_anamnesis
DROP POLICY IF EXISTS "Admin and staff manage anamnesis" ON public.patient_anamnesis;
CREATE POLICY "Admin and staff manage anamnesis" ON public.patient_anamnesis
  FOR ALL TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'staff'::public.app_role)
  )
  WITH CHECK (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'staff'::public.app_role)
  );

-- clinical_notes
DROP POLICY IF EXISTS "Admin and staff manage clinical notes" ON public.clinical_notes;
CREATE POLICY "Admin and staff manage clinical notes" ON public.clinical_notes
  FOR ALL TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'staff'::public.app_role)
  )
  WITH CHECK (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'staff'::public.app_role)
  );

-- patient_photos
DROP POLICY IF EXISTS "Admin and staff manage patient photos" ON public.patient_photos;
CREATE POLICY "Admin and staff manage patient photos" ON public.patient_photos
  FOR ALL TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'staff'::public.app_role)
  )
  WITH CHECK (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'staff'::public.app_role)
  );

-- storage.objects (bucket patient-photos)
DROP POLICY IF EXISTS "Admin and staff read patient photos" ON storage.objects;
CREATE POLICY "Admin and staff read patient photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'patient-photos'
    AND (
      private.has_role(auth.uid(), 'admin'::public.app_role)
      OR private.has_role(auth.uid(), 'staff'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Admin and staff upload patient photos" ON storage.objects;
CREATE POLICY "Admin and staff upload patient photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'patient-photos'
    AND (
      private.has_role(auth.uid(), 'admin'::public.app_role)
      OR private.has_role(auth.uid(), 'staff'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Admin and staff update patient photos" ON storage.objects;
CREATE POLICY "Admin and staff update patient photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'patient-photos'
    AND (
      private.has_role(auth.uid(), 'admin'::public.app_role)
      OR private.has_role(auth.uid(), 'staff'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Admin and staff delete patient photos" ON storage.objects;
CREATE POLICY "Admin and staff delete patient photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'patient-photos'
    AND (
      private.has_role(auth.uid(), 'admin'::public.app_role)
      OR private.has_role(auth.uid(), 'staff'::public.app_role)
    )
  );

-- 5) Remove a função pública (não é mais referenciada por nenhuma policy)
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
