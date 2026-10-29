-- Registra quando cada marco do funil foi efetivamente informado. Não inventa
-- datas para contatos antigos que já estavam em uma etapa posterior.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS evaluation_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS attended_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz,
  ADD COLUMN IF NOT EXISTS lost_at timestamptz,
  ADD COLUMN IF NOT EXISTS loss_reason text;

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_stage_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_stage_check CHECK (stage IN (
  'novo', 'contato', 'qualificado', 'agendamento', 'compareceu', 'convertido', 'perdido',
  'new', 'contacted', 'interested', 'evaluation_scheduled', 'attended', 'won', 'lost'
));

CREATE OR REPLACE FUNCTION public.record_lead_funnel_milestone()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.stage IS DISTINCT FROM OLD.stage THEN
    IF NEW.stage IN ('contato', 'contacted') THEN
      NEW.contacted_at := coalesce(NEW.contacted_at, now());
    ELSIF NEW.stage IN ('agendamento', 'evaluation_scheduled') THEN
      NEW.evaluation_scheduled_at := coalesce(NEW.evaluation_scheduled_at, now());
    ELSIF NEW.stage IN ('compareceu', 'attended') THEN
      NEW.attended_at := coalesce(NEW.attended_at, now());
    ELSIF NEW.stage IN ('convertido', 'won') THEN
      NEW.converted_at := coalesce(NEW.converted_at, now());
    ELSIF NEW.stage IN ('perdido', 'lost') THEN
      NEW.lost_at := coalesce(NEW.lost_at, now());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS record_lead_funnel_milestone ON public.leads;
CREATE TRIGGER record_lead_funnel_milestone BEFORE INSERT OR UPDATE OF stage
ON public.leads FOR EACH ROW EXECUTE FUNCTION public.record_lead_funnel_milestone();

CREATE INDEX IF NOT EXISTS leads_created_source_idx ON public.leads (created_at, source);
