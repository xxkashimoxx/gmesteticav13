import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Building2,
  Syringe,
  Clock,
  MessageCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClinicSettings } from '@/hooks/useClinicSettings';
import { cn } from '@/lib/utils';

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Seg' },
  { key: 'tue', label: 'Ter' },
  { key: 'wed', label: 'Qua' },
  { key: 'thu', label: 'Qui' },
  { key: 'fri', label: 'Sex' },
  { key: 'sat', label: 'Sáb' },
  { key: 'sun', label: 'Dom' },
];

type WH = Record<DayKey, { start: string; end: string; enabled: boolean }>;

const STEPS = [
  { key: 'clinic', title: 'Dados da clínica', icon: Building2 },
  { key: 'procedures', title: 'Procedimentos', icon: Syringe },
  { key: 'schedule', title: 'Agenda', icon: Clock },
  { key: 'whatsapp', title: 'WhatsApp', icon: MessageCircle },
] as const;

type ProcedureDraft = {
  id?: string;
  name: string;
  duration: string;
  default_price: number;
  category?: string | null;
};

const DEFAULT_CATALOG: ProcedureDraft[] = [
  { name: 'Botox (Toxina Botulínica)', duration: '45 min', default_price: 900, category: 'harmonização' },
  { name: 'Preenchimento labial', duration: '60 min', default_price: 1500, category: 'harmonização' },
  { name: 'Limpeza de pele profunda', duration: '60 min', default_price: 250, category: 'facial' },
  { name: 'Peeling químico', duration: '45 min', default_price: 400, category: 'facial' },
  { name: 'Microagulhamento', duration: '60 min', default_price: 500, category: 'facial' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { settings, loading, upsert, reload } = useClinicSettings();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [clinic, setClinic] = useState({
    clinic_name: '',
    phone: '',
    address: '',
    whatsapp_number: '',
  });
  const [wh, setWh] = useState<WH>(() => ({
    mon: { start: '09:00', end: '18:00', enabled: true },
    tue: { start: '09:00', end: '18:00', enabled: true },
    wed: { start: '09:00', end: '18:00', enabled: true },
    thu: { start: '09:00', end: '18:00', enabled: true },
    fri: { start: '09:00', end: '18:00', enabled: true },
    sat: { start: '09:00', end: '13:00', enabled: true },
    sun: { start: '09:00', end: '13:00', enabled: false },
  }));
  const [slotDuration, setSlotDuration] = useState(60);
  const [slotBuffer, setSlotBuffer] = useState(0);
  const [procs, setProcs] = useState<ProcedureDraft[]>([]);

  useEffect(() => {
    if (!settings) return;
    setClinic({
      clinic_name: settings.clinic_name,
      phone: settings.phone,
      address: settings.address,
      whatsapp_number: settings.whatsapp_number,
    });
    setWh(settings.working_hours as unknown as WH);
    setSlotDuration(settings.slot_duration_min);
    setSlotBuffer(settings.slot_buffer_min);
  }, [settings]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('procedures')
        .select('id,name,duration,default_price,category')
        .order('created_at', { ascending: true });
      setProcs(((data ?? []) as unknown as ProcedureDraft[]).map((p) => ({
        ...p,
        default_price: Number(p.default_price ?? 0),
        duration: p.duration ?? '',
      })));
    })();
  }, []);

  const canFinish = useMemo(
    () => clinic.clinic_name.trim().length > 0 && procs.length > 0,
    [clinic.clinic_name, procs.length],
  );

  if (role && role !== 'admin') {
    return (
      <div className="p-6 max-w-xl mx-auto text-center space-y-3">
        <h1 className="text-2xl font-bold">Onboarding restrito</h1>
        <p className="text-muted-foreground">Apenas a administradora pode concluir a configuração inicial.</p>
        <Button onClick={() => navigate('/')}>Voltar para o início</Button>
      </div>
    );
  }

  async function saveClinic() {
    setSaving(true);
    const { error } = await upsert({ ...clinic });
    setSaving(false);
    if (error) return toast.error('Falha ao salvar dados', { description: error.message });
    toast.success('Dados da clínica salvos');
  }

  async function saveSchedule() {
    setSaving(true);
    const { error } = await upsert({
      working_hours: wh as unknown as never,
      slot_duration_min: slotDuration,
      slot_buffer_min: slotBuffer,
    });
    setSaving(false);
    if (error) return toast.error('Falha ao salvar horários', { description: error.message });
    toast.success('Horários salvos');
  }

  async function saveProcedure(p: ProcedureDraft, index: number) {
    if (!p.name.trim()) return;
    if (p.id) {
      const { error } = await supabase
        .from('procedures')
        .update({
          name: p.name,
          duration: p.duration,
          default_price: p.default_price,
          category: p.category ?? null,
        })
        .eq('id', p.id);
      if (error) return toast.error('Falha ao salvar procedimento', { description: error.message });
    } else {
      const { data, error } = await supabase
        .from('procedures')
        .insert({
          name: p.name,
          duration: p.duration,
          default_price: p.default_price,
          category: p.category ?? null,
        })
        .select()
        .single();
      if (error) return toast.error('Falha ao salvar procedimento', { description: error.message });
      setProcs((prev) => prev.map((it, i) => (i === index ? { ...it, id: data.id } : it)));
    }
    toast.success(`Procedimento salvo: ${p.name}`);
  }

  async function removeProcedure(p: ProcedureDraft, index: number) {
    if (p.id) {
      const { error } = await supabase.from('procedures').delete().eq('id', p.id);
      if (error) return toast.error('Falha ao remover', { description: error.message });
    }
    setProcs((prev) => prev.filter((_, i) => i !== index));
  }

  function addProcedureRow() {
    setProcs((p) => [...p, { name: '', duration: '60 min', default_price: 0, category: '' }]);
  }

  function loadCatalog() {
    setProcs((p) => {
      const existing = new Set(p.map((x) => x.name.toLowerCase()));
      const additions = DEFAULT_CATALOG.filter((c) => !existing.has(c.name.toLowerCase()));
      return [...p, ...additions];
    });
    toast.info('Catálogo pré-preenchido. Ajuste preços e salve cada item.');
  }

  async function finish() {
    setSaving(true);
    const { error } = await upsert({ onboarding_completed: true });
    setSaving(false);
    if (error) return toast.error('Falha ao concluir', { description: error.message });
    toast.success('Configuração concluída!');
    await reload();
    navigate('/');
  }

  if (loading || !user) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Sparkles className="w-4 h-4" /> Bem-vinda à GM Estética Avançada
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">Vamos configurar sua clínica</h1>
        <p className="text-muted-foreground text-sm">
          Preencha em 4 passos rápidos. Você pode voltar e editar depois em Configurações.
        </p>
      </div>

      {/* Stepper */}
      <div className="grid grid-cols-4 gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <button
              key={s.key}
              onClick={() => setStep(i)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-smooth',
                active && 'border-primary bg-primary/5',
                done && 'border-success/40 bg-success/5',
                !active && !done && 'border-border bg-background',
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center',
                active ? 'bg-primary text-primary-foreground' : done ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground',
              )}>
                {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={cn('font-medium', active ? 'text-primary' : done ? 'text-success' : 'text-muted-foreground')}>
                {i + 1}. {s.title}
              </span>
            </button>
          );
        })}
      </div>

      {step === 0 && (
        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader><CardTitle>Dados da clínica</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Nome da clínica *</Label>
              <Input value={clinic.clinic_name} onChange={(e) => setClinic({ ...clinic, clinic_name: e.target.value })} placeholder="GM Estética Avançada" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Telefone principal</Label>
                <Input value={clinic.phone} onChange={(e) => setClinic({ ...clinic, phone: e.target.value })} placeholder="(31) 99999-9999" />
              </div>
              <div className="grid gap-2">
                <Label>WhatsApp da clínica</Label>
                <Input value={clinic.whatsapp_number} onChange={(e) => setClinic({ ...clinic, whatsapp_number: e.target.value })} placeholder="31999999999" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Endereço</Label>
              <Input value={clinic.address} onChange={(e) => setClinic({ ...clinic, address: e.target.value })} placeholder="Rua ..., nº, bairro, cidade" />
            </div>
            <Button onClick={saveClinic} disabled={saving || !clinic.clinic_name.trim()} className="bg-gradient-primary text-primary-foreground">
              Salvar dados
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Catálogo de procedimentos</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadCatalog}>Usar catálogo sugerido</Button>
              <Button size="sm" onClick={addProcedureRow}><Plus className="w-4 h-4 mr-1" />Novo</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {procs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum procedimento ainda. Comece pelo catálogo sugerido ou adicione manualmente.
              </p>
            )}
            {procs.map((p, i) => (
              <div key={p.id ?? `new-${i}`} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg border border-border bg-background">
                <div className="col-span-12 md:col-span-5 grid gap-1">
                  <Label className="text-xs">Nome</Label>
                  <Input value={p.name} onChange={(e) => setProcs((prev) => prev.map((it, idx) => idx === i ? { ...it, name: e.target.value } : it))} />
                </div>
                <div className="col-span-4 md:col-span-2 grid gap-1">
                  <Label className="text-xs">Duração (min)</Label>
                  <Input value={p.duration} onChange={(e) => setProcs((prev) => prev.map((it, idx) => idx === i ? { ...it, duration: e.target.value } : it))} />
                </div>
                <div className="col-span-4 md:col-span-2 grid gap-1">
                  <Label className="text-xs">Preço (R$)</Label>
                  <Input type="number" value={p.default_price} onChange={(e) => setProcs((prev) => prev.map((it, idx) => idx === i ? { ...it, default_price: Number(e.target.value) } : it))} />
                </div>
                <div className="col-span-4 md:col-span-2 grid gap-1">
                  <Label className="text-xs">Categoria</Label>
                  <Input value={p.category ?? ''} onChange={(e) => setProcs((prev) => prev.map((it, idx) => idx === i ? { ...it, category: e.target.value } : it))} />
                </div>
                <div className="col-span-12 md:col-span-1 flex gap-1">
                  <Button size="sm" onClick={() => saveProcedure(p, i)}>Salvar</Button>
                  <Button size="icon" variant="ghost" onClick={() => removeProcedure(p, i)} aria-label="Remover">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader><CardTitle>Horários de atendimento</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Duração padrão de cada slot (min)</Label>
                <Input type="number" value={slotDuration} onChange={(e) => setSlotDuration(Number(e.target.value))} />
              </div>
              <div className="grid gap-2">
                <Label>Intervalo entre atendimentos (min)</Label>
                <Input type="number" value={slotBuffer} onChange={(e) => setSlotBuffer(Number(e.target.value))} />
              </div>
            </div>
            <div className="space-y-2">
              {DAYS.map((d) => (
                <div key={d.key} className="grid grid-cols-12 items-center gap-2 p-2 rounded-lg border border-border bg-background">
                  <div className="col-span-3 md:col-span-2 flex items-center gap-2">
                    <Switch checked={wh[d.key].enabled} onCheckedChange={(v) => setWh({ ...wh, [d.key]: { ...wh[d.key], enabled: v } })} />
                    <span className="font-medium text-sm">{d.label}</span>
                  </div>
                  <div className="col-span-4 md:col-span-3">
                    <Input type="time" value={wh[d.key].start} disabled={!wh[d.key].enabled} onChange={(e) => setWh({ ...wh, [d.key]: { ...wh[d.key], start: e.target.value } })} />
                  </div>
                  <div className="col-span-1 text-center text-xs text-muted-foreground">até</div>
                  <div className="col-span-4 md:col-span-3">
                    <Input type="time" value={wh[d.key].end} disabled={!wh[d.key].enabled} onChange={(e) => setWh({ ...wh, [d.key]: { ...wh[d.key], end: e.target.value } })} />
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={saveSchedule} disabled={saving} className="bg-gradient-primary text-primary-foreground">
              Salvar horários
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader><CardTitle>WhatsApp</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              O sistema abre o WhatsApp Web com a mensagem pronta quando você cria, remarca ou cancela um agendamento, e nos lembretes de 24h e 2h antes.
            </p>
            <div className="grid gap-2">
              <Label>Número do WhatsApp da clínica</Label>
              <Input value={clinic.whatsapp_number} onChange={(e) => setClinic({ ...clinic, whatsapp_number: e.target.value })} placeholder="somente números com DDD" />
            </div>
            <Button variant="outline" onClick={saveClinic} disabled={saving}>Salvar número</Button>

            <div className="rounded-lg border border-border bg-background p-3 space-y-2 text-xs">
              <p className="font-medium text-foreground text-sm">Templates atuais (editáveis em iteração futura)</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>Confirmação</strong> — enviada ao criar o agendamento.</li>
                <li><strong>Lembrete 24h</strong> — enviada 1 dia antes.</li>
                <li><strong>Lembrete 2h</strong> — enviada 2 horas antes.</li>
                <li><strong>Remarcação / Cancelamento</strong> — enviada ao alterar.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        {step < STEPS.length - 1 ? (
          <Button className="bg-gradient-primary text-primary-foreground" onClick={() => setStep((s) => s + 1)}>
            Próximo <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button className="bg-gradient-primary text-primary-foreground" onClick={finish} disabled={!canFinish || saving}>
            <Check className="w-4 h-4 mr-1" /> Concluir configuração
          </Button>
        )}
      </div>

      <div className="text-center">
        <button className="text-xs text-muted-foreground underline" onClick={() => navigate('/')}>
          Pular por enquanto
        </button>
      </div>
    </div>
  );
}
