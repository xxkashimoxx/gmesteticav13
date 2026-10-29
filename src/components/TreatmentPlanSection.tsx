import { useEffect, useState } from 'react';
import { Printer, Save, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type TreatmentPlan = {
  id: string;
  version: number;
  chief_concern: string;
  patient_goal: string;
  assessment_summary: string;
  proposed_care: string;
  session_plan: string | null;
  guidance: string | null;
  follow_up_on: string | null;
  follow_up_completed_at: string | null;
  created_at: string;
};

type Form = Omit<TreatmentPlan, 'id' | 'version' | 'created_at' | 'follow_up_completed_at'>;
const emptyForm: Form = {
  chief_concern: '', patient_goal: '', assessment_summary: '', proposed_care: '',
  session_plan: '', guidance: '', follow_up_on: '',
};
const db = supabase as any;

function esc(value: string | null | undefined) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[char] ?? char));
}

export function TreatmentPlanSection({ leadId, patientName }: { leadId: string; patientName: string }) {
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const latest = plans[0];

  async function load() {
    const { data, error } = await db.from('treatment_plans').select('*')
      .eq('lead_id', leadId).order('version', { ascending: false });
    if (error) toast.error('Não foi possível carregar o plano', { description: error.message });
    else {
      const rows = (data ?? []) as TreatmentPlan[];
      setPlans(rows);
      if (rows[0]) setForm({
        chief_concern: rows[0].chief_concern, patient_goal: rows[0].patient_goal,
        assessment_summary: rows[0].assessment_summary, proposed_care: rows[0].proposed_care,
        session_plan: rows[0].session_plan ?? '', guidance: rows[0].guidance ?? '',
        follow_up_on: rows[0].follow_up_on ?? '',
      });
    }
  }
  useEffect(() => { void load(); }, [leadId]);

  async function save() {
    if (![form.chief_concern, form.patient_goal, form.assessment_summary, form.proposed_care].every(v => v.trim())) {
      toast.error('Preencha queixa, objetivo, avaliação e proposta');
      return;
    }
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await db.from('treatment_plans').insert({
      lead_id: leadId, version: (latest?.version ?? 0) + 1,
      chief_concern: form.chief_concern.trim(), patient_goal: form.patient_goal.trim(),
      assessment_summary: form.assessment_summary.trim(), proposed_care: form.proposed_care.trim(),
      session_plan: form.session_plan?.trim() || null, guidance: form.guidance?.trim() || null,
      follow_up_on: form.follow_up_on || null, created_by: auth.user?.id ?? null,
    });
    setSaving(false);
    if (error) toast.error('Falha ao salvar o plano', { description: error.message });
    else { toast.success('Nova versão do plano salva'); await load(); }
  }

  async function completeFollowUp(plan: TreatmentPlan) {
    const { error } = await db.from('treatment_plans')
      .update({ follow_up_completed_at: new Date().toISOString() }).eq('id', plan.id);
    if (error) toast.error('Falha ao concluir retorno', { description: error.message });
    else { toast.success('Retorno concluído'); await load(); }
  }

  function printPlan(plan: TreatmentPlan) {
    const page = window.open('', '_blank');
    if (!page) return toast.error('O navegador bloqueou a janela de impressão');
    page.opener = null;
    const item = (label: string, value: string | null) => value
      ? `<section><h2>${esc(label)}</h2><p>${esc(value).replace(/\n/g, '<br>')}</p></section>` : '';
    page.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Plano de tratamento</title>
      <style>body{font-family:Arial,sans-serif;color:#1f2933;max-width:760px;margin:40px auto;line-height:1.55}header{border-bottom:2px solid #155e75;padding-bottom:18px;margin-bottom:28px}h1{font-family:Georgia,serif;color:#164e63;margin:0 0 6px}h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#155e75;margin:22px 0 6px}p{white-space:normal;margin:0}.meta{color:#52606d;font-size:13px}.note{font-size:12px;color:#697680;margin-top:30px}.signature{margin-top:70px;border-top:1px solid #7b8794;width:280px;padding-top:8px}@media print{body{margin:18mm auto}}</style></head><body>
      <header><h1>Plano de tratamento individualizado</h1><div class="meta">GM Estética Avançada<br>Paciente: ${esc(patientName)}<br>Versão ${plan.version} · ${new Date(plan.created_at).toLocaleDateString('pt-BR')}</div></header>
      ${item('Queixa principal', plan.chief_concern)}${item('Objetivo relatado', plan.patient_goal)}${item('Avaliação', plan.assessment_summary)}${item('Proposta de cuidado', plan.proposed_care)}${item('Planejamento de sessões', plan.session_plan)}${item('Orientações', plan.guidance)}
      ${plan.follow_up_on ? item('Retorno sugerido', new Date(`${plan.follow_up_on}T12:00:00`).toLocaleDateString('pt-BR')) : ''}
      <p class="note">O plano pode ser ajustado conforme a resposta individual e a reavaliação profissional. Este documento não constitui promessa de resultado.</p>
      <div class="signature">Dra. Goreti Magalhães<br>GM Estética Avançada</div>
      <script>window.onload=()=>window.print()<\/script></body></html>`);
    page.document.close();
  }

  return <div className="space-y-4">
    <Card className="shadow-card border-0 bg-gradient-card">
      <CardHeader><CardTitle className="text-base">Plano de tratamento por escrito</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div><Label>Queixa principal *</Label><Textarea rows={2} value={form.chief_concern} onChange={e => setForm({ ...form, chief_concern: e.target.value })} placeholder="O que trouxe a paciente ao consultório" /></div>
        <div><Label>Objetivo relatado pela paciente *</Label><Textarea rows={2} value={form.patient_goal} onChange={e => setForm({ ...form, patient_goal: e.target.value })} /></div>
        <div><Label>Resumo da avaliação *</Label><Textarea rows={3} value={form.assessment_summary} onChange={e => setForm({ ...form, assessment_summary: e.target.value })} placeholder="Achados e análise individual" /></div>
        <div><Label>Proposta de cuidado *</Label><Textarea rows={4} value={form.proposed_care} onChange={e => setForm({ ...form, proposed_care: e.target.value })} placeholder="Procedimentos sugeridos e finalidade de cada etapa" /></div>
        <div><Label>Planejamento de sessões</Label><Textarea rows={2} value={form.session_plan ?? ''} onChange={e => setForm({ ...form, session_plan: e.target.value })} placeholder="Quantidade, intervalo e sequência, quando definidos" /></div>
        <div><Label>Orientações</Label><Textarea rows={3} value={form.guidance ?? ''} onChange={e => setForm({ ...form, guidance: e.target.value })} /></div>
        <div className="max-w-xs"><Label>Data sugerida de retorno</Label><Input type="date" min={new Date().toISOString().slice(0, 10)} value={form.follow_up_on ?? ''} onChange={e => setForm({ ...form, follow_up_on: e.target.value })} /></div>
        <Button onClick={save} disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? 'Salvando...' : 'Salvar nova versão'}</Button>
      </CardContent>
    </Card>

    {plans.map(plan => <Card key={plan.id} className="shadow-card border-0 bg-gradient-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><p className="font-semibold">Plano v{plan.version}</p><p className="text-xs text-muted-foreground">{new Date(plan.created_at).toLocaleString('pt-BR')}</p></div>
          <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => printPlan(plan)}><Printer className="w-4 h-4 mr-1" />Imprimir ou salvar em PDF</Button></div>
        </div>
        <p className="text-sm"><b>Queixa:</b> {plan.chief_concern}</p>
        <p className="text-sm"><b>Proposta:</b> {plan.proposed_care}</p>
        {plan.follow_up_on && <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant={plan.follow_up_completed_at ? 'secondary' : 'outline'}>Retorno: {new Date(`${plan.follow_up_on}T12:00:00`).toLocaleDateString('pt-BR')}</Badge>
          {!plan.follow_up_completed_at && <Button size="sm" variant="outline" onClick={() => completeFollowUp(plan)}><CheckCircle2 className="w-4 h-4 mr-1" />Marcar retorno concluído</Button>}
        </div>}
      </CardContent>
    </Card>)}
  </div>;
}
