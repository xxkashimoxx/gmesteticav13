-- LEADS
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  source text NOT NULL DEFAULT 'Outros',
  campaign text,
  procedure_id uuid REFERENCES public.procedures(id) ON DELETE SET NULL,
  procedure_interest text,
  temperature text NOT NULL DEFAULT 'warm' CHECK (temperature IN ('hot','warm','cold')),
  stage text NOT NULL DEFAULT 'novo' CHECK (stage IN ('novo','contato','qualificado','agendamento','convertido','perdido')),
  score integer NOT NULL DEFAULT 0,
  estimated_value numeric NOT NULL DEFAULT 0,
  last_contact_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admin update leads" ON public.leads FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete leads" ON public.leads FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- INTERACTIONS (histórico de conversas)
CREATE TABLE public.lead_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'whatsapp',
  direction text NOT NULL DEFAULT 'out' CHECK (direction IN ('in','out','note')),
  message text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_interactions TO authenticated;
GRANT ALL ON public.lead_interactions TO service_role;
ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view interactions" ON public.lead_interactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert interactions" ON public.lead_interactions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admin update interactions" ON public.lead_interactions FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete interactions" ON public.lead_interactions FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- APPOINTMENTS
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  patient_name text NOT NULL,
  patient_phone text,
  procedure_id uuid REFERENCES public.procedures(id) ON DELETE SET NULL,
  procedure_name text,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  value numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view appointments" ON public.appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert appointments" ON public.appointments FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admin update appointments" ON public.appointments FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete appointments" ON public.appointments FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PROCEDURE SALES
CREATE TABLE public.procedure_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id uuid REFERENCES public.procedures(id) ON DELETE SET NULL,
  procedure_name text NOT NULL,
  patient_name text NOT NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  source text,
  value numeric NOT NULL DEFAULT 0,
  sold_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.procedure_sales TO authenticated;
GRANT ALL ON public.procedure_sales TO service_role;
ALTER TABLE public.procedure_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view sales" ON public.procedure_sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert sales" ON public.procedure_sales FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admin update sales" ON public.procedure_sales FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete sales" ON public.procedure_sales FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

CREATE INDEX idx_leads_temperature ON public.leads(temperature);
CREATE INDEX idx_leads_source ON public.leads(source);
CREATE INDEX idx_leads_stage ON public.leads(stage);
CREATE INDEX idx_interactions_lead ON public.lead_interactions(lead_id, created_at DESC);
CREATE INDEX idx_appointments_scheduled ON public.appointments(scheduled_at);
CREATE INDEX idx_sales_sold_at ON public.procedure_sales(sold_at DESC);
CREATE INDEX idx_sales_procedure ON public.procedure_sales(procedure_id);