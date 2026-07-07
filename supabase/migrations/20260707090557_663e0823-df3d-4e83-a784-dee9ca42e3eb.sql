
DROP POLICY "Authenticated can view integrations" ON public.app_integrations;
CREATE POLICY "Admin and staff view integrations" ON public.app_integrations FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'staff'::app_role));

DROP POLICY "Authenticated view appointments" ON public.appointments;
CREATE POLICY "Admin and staff view appointments" ON public.appointments FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'staff'::app_role));

DROP POLICY "Authenticated view interactions" ON public.lead_interactions;
CREATE POLICY "Admin and staff view interactions" ON public.lead_interactions FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'staff'::app_role));

DROP POLICY "Authenticated view leads" ON public.leads;
CREATE POLICY "Admin and staff view leads" ON public.leads FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'staff'::app_role));

DROP POLICY "Authenticated view sales" ON public.procedure_sales;
CREATE POLICY "Admin and staff view sales" ON public.procedure_sales FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'staff'::app_role));
