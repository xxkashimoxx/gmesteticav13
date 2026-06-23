
CREATE TABLE public.procedures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  default_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration TEXT,
  sessions_recommended INTEGER NOT NULL DEFAULT 1,
  highlight TEXT,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.procedures TO authenticated;
GRANT ALL ON public.procedures TO service_role;

ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view procedures"
  ON public.procedures FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert procedures"
  ON public.procedures FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update procedures"
  ON public.procedures FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete procedures"
  ON public.procedures FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_procedures_updated_at
  BEFORE UPDATE ON public.procedures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.procedures (name, category, description, default_price, duration, sessions_recommended, highlight) VALUES
('Preenchimento Labial', 'Harmonização', 'Hidratação e contorno labial com ácido hialurônico.', 1200, '45 min', 1, 'Mais procurado'),
('Harmonização Facial Completa', 'Harmonização', 'Avaliação 360° + preenchimentos estratégicos e botox.', 4500, '2h', 1, 'Top receita'),
('Botox - Testa e Glabela', 'Toxina', 'Toxina botulínica para suavizar rugas dinâmicas.', 1600, '30 min', 1, NULL),
('Bioestimulador de Colágeno', 'Bioestimulador', 'Sculptra/Radiesse para firmeza e sustentação da pele.', 2400, '60 min', 3, NULL),
('Skinbooster + Limpeza', 'Skincare', 'Hidratação profunda com microinjeções de ácido hialurônico.', 900, '60 min', 3, NULL),
('Ultraformer / Lifting', 'Tecnologia', 'Lifting não cirúrgico com ultrassom microfocado.', 3200, '90 min', 1, NULL),
('Preenchimento Zigomático', 'Harmonização', 'Definição e projeção da região do zigoma.', 1500, '60 min', 1, NULL),
('Avaliação Facial', 'Harmonização', 'Consulta inicial e planejamento personalizado.', 250, '40 min', 1, NULL);
