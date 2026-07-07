
CREATE POLICY "Admin and staff read patient photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'patient-photos' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')));

CREATE POLICY "Admin and staff upload patient photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'patient-photos' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')));

CREATE POLICY "Admin and staff update patient photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'patient-photos' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')));

CREATE POLICY "Admin and staff delete patient photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'patient-photos' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')));
