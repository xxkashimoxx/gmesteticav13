import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Flame,
  Thermometer,
  Snowflake,
  Plus,
  Search,
  MessageCircle,
  CalendarPlus,
  TrendingUp,
  Users,
  Target,
  AlertTriangle,
  History,
  Pencil,
  ArrowRight,
} from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { brl, daysSince, LEAD_SOURCES, startOfWeek } from '@/lib/format';
import { cn } from '@/lib/utils';

type Temp = 'hot' | 'warm' | 'cold';
type Stage = 'novo' | 'contato' | 'qualificado' | 'agendamento' | 'convertido' | 'perdido';

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string;
  campaign: string | null;
  procedure_interest: string | null;
  temperature: Temp;
  stage: Stage;
  score: number;
  estimated_value: number;
  last_contact_at: string | null;
  notes: string | null;
  created_at: string;
}

interface Interaction {
  id: string;
  lead_id: string;
  channel: string;
  direction: 'in' | 'out' | 'note';
  message: string;
  created_at: string;
}

interface ProcedureOption {
  id: string;
  name: string;
  default_price: number | null;
}

const STAGES: Stage[] = ['novo', 'contato', 'qualificado', 'agendamento', 'convertido', 'perdido'];
const stageLabel: Record<Stage, string> = {
  novo: 'Novo',
  contato: 'Em contato',
  qualificado: 'Qualificado',
  agendamento: 'Agendou avaliação',
  convertido: 'Fechou procedimento',
  perdido: 'Perdido',
};
const stageColor: Record<Stage, string> = {
  novo: 'border-l-primary',
  contato: 'border-l-accent',
  qualificado: 'border-l-warning',
  agendamento: 'border-l-secondary',
  convertido: 'border-l-success',
  perdido: 'border-l-destructive',
};

const tempConfig: Record<Temp, { label: string; icon: typeof Flame; chip: string; ring: string }> = {
  hot: { label: 'Quente', icon: Flame, chip: 'bg-destructive text-destructive-foreground', ring: 'ring-2 ring-destructive/60' },
  warm: { label: 'Morno', icon: Thermometer, chip: 'bg-warning text-warning-foreground', ring: 'ring-2 ring-warning/60' },
  cold: { label: 'Frio', icon: Snowflake, chip: 'bg-primary text-primary-foreground', ring: 'ring-2 ring-primary/40' },
};

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  source: 'Meta Ads',
  campaign: '',
  procedure_interest: '',
  temperature: 'warm' as Temp,
  stage: 'novo' as Stage,
  score: 50,
  estimated_value: 0,
  notes: '',
};

function toLocalInputValue(d: Date) {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

export default function Leads() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const canEdit = role === 'admin' || role === 'staff';

  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointmentsCount, setAppointmentsCount] = useState({ total: 0, week: 0 });
  const [procedures, setProcedures] = useState<ProcedureOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('Todas');
  const [viewMode, setViewMode] = useState<'stage' | 'temperature'>('stage');

  // CRUD
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Detail / interactions
  const [detail, setDetail] = useState<Lead | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [newChannel, setNewChannel] = useState('whatsapp');
  const [newDir, setNewDir] = useState<'in' | 'out' | 'note'>('out');

  // Quick schedule
  const [scheduleLead, setScheduleLead] = useState<Lead | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    procedure_id: '',
    scheduled_at: toLocalInputValue(new Date(Date.now() + 24 * 3600 * 1000)),
    value: 0,
    notes: '',
  });
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: ldata, error }, { count: total }, { count: week }, { data: procs }] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('appointments').select('*', { count: 'exact', head: true }),
      supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_at', startOfWeek().toISOString()),
      supabase.from('procedures').select('id, name, default_price').order('name'),
    ]);
    if (error) toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' });
    setLeads((ldata ?? []) as Lead[]);
    setProcedures((procs ?? []) as ProcedureOption[]);
    setAppointmentsCount({ total: total ?? 0, week: week ?? 0 });
    setLoading(false);
  }

  async function openDetail(l: Lead) {
    setDetail(l);
    const { data } = await supabase
      .from('lead_interactions')
      .select('*')
      .eq('lead_id', l.id)
      .order('created_at', { ascending: false });
    setInteractions((data ?? []) as Interaction[]);
  }

  async function addInteraction() {
    if (!detail || !newMsg.trim()) return;
    const { error } = await supabase.from('lead_interactions').insert({
      lead_id: detail.id,
      channel: newChannel,
      direction: newDir,
      message: newMsg.trim(),
    });
    if (error) {
      toast({ title: 'Erro ao registrar', description: error.message, variant: 'destructive' });
      return;
    }
    await supabase.from('leads').update({ last_contact_at: new Date().toISOString() }).eq('id', detail.id);
    setNewMsg('');
    openDetail(detail);
    load();
  }

  async function moveStage(l: Lead, stage: Stage) {
    const { error } = await supabase.from('leads').update({ stage }).eq('id', l.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `Movido para "${stageLabel[stage]}"` });
    setLeads((prev) => prev.map((x) => (x.id === l.id ? { ...x, stage } : x)));
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(l: Lead) {
    setEditing(l);
    setForm({
      name: l.name,
      phone: l.phone ?? '',
      email: l.email ?? '',
      source: l.source,
      campaign: l.campaign ?? '',
      procedure_interest: l.procedure_interest ?? '',
      temperature: l.temperature,
      stage: l.stage,
      score: l.score,
      estimated_value: Number(l.estimated_value),
      notes: l.notes ?? '',
    });
    setDialogOpen(true);
  }

  function openSchedule(l: Lead) {
    setScheduleLead(l);
    const proc = procedures.find(
      (p) => p.name.toLowerCase() === (l.procedure_interest ?? '').toLowerCase(),
    );
    setScheduleForm({
      procedure_id: proc?.id ?? '',
      scheduled_at: toLocalInputValue(new Date(Date.now() + 24 * 3600 * 1000)),
      value: Number(proc?.default_price ?? l.estimated_value ?? 0),
      notes: l.notes ?? '',
    });
  }

  async function confirmSchedule() {
    if (!scheduleLead) return;
    if (!scheduleForm.scheduled_at) {
      toast({ title: 'Selecione uma data', variant: 'destructive' });
      return;
    }
    setScheduling(true);
    const proc = procedures.find((p) => p.id === scheduleForm.procedure_id);
    const { error } = await supabase.from('appointments').insert({
      patient_name: scheduleLead.name,
      patient_phone: scheduleLead.phone,
      procedure_id: scheduleForm.procedure_id || null,
      procedure_name: proc?.name ?? scheduleLead.procedure_interest ?? null,
      scheduled_at: new Date(scheduleForm.scheduled_at).toISOString(),
      value: Number(scheduleForm.value) || 0,
      notes: scheduleForm.notes || null,
      status: 'scheduled',
    });
    if (error) {
      setScheduling(false);
      toast({ title: 'Erro ao agendar', description: error.message, variant: 'destructive' });
      return;
    }
    // avança lead para agendamento + registra interação
    await supabase.from('leads').update({ stage: 'agendamento', last_contact_at: new Date().toISOString() }).eq('id', scheduleLead.id);
    await supabase.from('lead_interactions').insert({
      lead_id: scheduleLead.id,
      channel: 'sistema',
      direction: 'note',
      message: `Avaliação agendada para ${new Date(scheduleForm.scheduled_at).toLocaleString('pt-BR')}${proc ? ` — ${proc.name}` : ''}`,
    });
    setScheduling(false);
    setScheduleLead(null);
    toast({ title: 'Avaliação agendada e lead movido para "Agendou avaliação"' });
    load();
  }

  async function save() {
    if (!form.name.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      source: form.source,
      campaign: form.campaign.trim() || null,
      procedure_interest: form.procedure_interest.trim() || null,
      temperature: form.temperature,
      stage: form.stage,
      score: Number(form.score) || 0,
      estimated_value: Number(form.estimated_value) || 0,
      notes: form.notes.trim() || null,
    };
    const { error } = editing
      ? await supabase.from('leads').update(payload).eq('id', editing.id)
      : await supabase.from('leads').insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editing ? 'Lead atualizado' : 'Lead criado' });
    setDialogOpen(false);
    load();
  }

  // ---- Filters / KPIs ----
  const filtered = useMemo(
    () =>
      leads.filter((l) => {
        const s = search.toLowerCase();
        const matchSearch =
          !s ||
          l.name.toLowerCase().includes(s) ||
          (l.procedure_interest ?? '').toLowerCase().includes(s) ||
          l.source.toLowerCase().includes(s);
        const matchSource = sourceFilter === 'Todas' || l.source === sourceFilter;
        return matchSearch && matchSource;
      }),
    [leads, search, sourceFilter],
  );

  const hot = filtered.filter((l) => l.temperature === 'hot');
  const warm = filtered.filter((l) => l.temperature === 'warm');
  const cold = filtered.filter((l) => l.temperature === 'cold');
  const pipeline = filtered.reduce((s, l) => s + Number(l.estimated_value), 0);
  const hotIdle = hot.filter((l) => daysSince(l.last_contact_at) >= 2);

  const weekStart = startOfWeek();
  const weekConversions = leads.filter(
    (l) => l.stage === 'convertido' && new Date(l.created_at) >= weekStart,
  );
  const agendados = leads.filter((l) => l.stage === 'agendamento' || l.stage === 'convertido').length;
  const taxaAgendamento = leads.length ? Math.round((agendados / leads.length) * 100) : 0;

  const bySource = useMemo(() => {
    const m = new Map<string, { total: number; conv: number; pipeline: number }>();
    for (const l of leads) {
      const cur = m.get(l.source) ?? { total: 0, conv: 0, pipeline: 0 };
      cur.total++;
      cur.pipeline += Number(l.estimated_value);
      if (l.stage === 'convertido') cur.conv++;
      m.set(l.source, cur);
    }
    return Array.from(m.entries())
      .map(([source, v]) => ({ source, ...v, rate: v.total ? (v.conv / v.total) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [leads]);

  const byStage = useMemo(() => {
    const m: Record<Stage, Lead[]> = {
      novo: [], contato: [], qualificado: [], agendamento: [], convertido: [], perdido: [],
    };
    for (const l of filtered) m[l.stage].push(l);
    return m;
  }, [filtered]);

  function renderCard(l: Lead) {
    const cfg = tempConfig[l.temperature];
    const idle = daysSince(l.last_contact_at);
    const isIdle = idle >= 2 && l.stage !== 'convertido' && l.stage !== 'perdido';
    return (
      <div
        key={l.id}
        className={cn(
          'p-3 rounded-xl bg-background border border-border shadow-sm space-y-2 border-l-4',
          stageColor[l.stage],
          isIdle && 'ring-2 ring-destructive/40',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{l.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {l.source}{l.campaign ? ` · ${l.campaign}` : ''}
            </p>
          </div>
          <Badge className={cn('shrink-0 text-[10px] px-1.5 py-0', cfg.chip)}>{cfg.label}</Badge>
        </div>
        {l.procedure_interest && <p className="text-xs truncate">{l.procedure_interest}</p>}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Ticket: <span className="font-semibold text-foreground">{brl(Number(l.estimated_value))}</span></span>
          <span className={cn(isIdle && 'text-destructive font-semibold')}>
            {idle === Infinity ? 'sem contato' : `${idle}d`}
          </span>
        </div>
        <div className="flex gap-1 pt-1">
          {l.phone && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2"
              asChild
              title="WhatsApp"
            >
              <a href={`https://wa.me/${l.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                <MessageCircle className="w-3 h-3" />
              </a>
            </Button>
          )}
          {canEdit && l.stage !== 'convertido' && l.stage !== 'perdido' && (
            <Button
              size="sm"
              className="h-7 px-2 flex-1 bg-gradient-primary text-primary-foreground text-[11px]"
              onClick={() => openSchedule(l)}
              title="Agendar avaliação"
            >
              <CalendarPlus className="w-3 h-3 mr-1" /> Agendar
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => openDetail(l)} title="Histórico">
            <History className="w-3 h-3" />
          </Button>
          {canEdit && (
            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => openEdit(l)} title="Editar">
              <Pencil className="w-3 h-3" />
            </Button>
          )}
        </div>
        {canEdit && (
          <Select value={l.stage} onValueChange={(v: Stage) => moveStage(l, v)}>
            <SelectTrigger className="h-7 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {stageLabel[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Captação → agendamento em 1 clique
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} className="bg-gradient-primary text-primary-foreground shadow-card">
            <Plus className="w-4 h-4 mr-2" /> Novo Lead
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard title="Total de Leads" value={filtered.length.toString()} icon={Users} className="border-l-4 border-l-primary" />
        <StatCard title="Conversões na semana" value={weekConversions.length.toString()} icon={TrendingUp} className="border-l-4 border-l-success" />
        <StatCard title="Taxa de Agendamento" value={`${taxaAgendamento}%`} icon={Target} className="border-l-4 border-l-warning" />
        <StatCard title="Pipeline Estimado" value={brl(pipeline)} icon={TrendingUp} className="border-l-4 border-l-accent" />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar lead, procedimento, origem..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todas">Todas as origens</SelectItem>
            {LEAD_SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Alerta de quentes sem contato */}
      {hotIdle.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {hotIdle.length} lead{hotIdle.length > 1 ? 's' : ''} quente{hotIdle.length > 1 ? 's' : ''} sem contato há +2 dias
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hotIdle.slice(0, 5).map((l) => (
              <button
                key={l.id}
                onClick={() => openDetail(l)}
                className="w-full flex items-center justify-between p-2 bg-background rounded-lg hover:bg-muted/50 transition"
              >
                <div className="text-left">
                  <p className="font-medium text-sm">{l.name}</p>
                  <p className="text-xs text-muted-foreground">{l.source} · {l.procedure_interest ?? '—'}</p>
                </div>
                <Badge variant="destructive">
                  {daysSince(l.last_contact_at) === Infinity ? 'sem contato' : `${daysSince(l.last_contact_at)}d`}
                </Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Kanban */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'stage' | 'temperature')}>
        <TabsList>
          <TabsTrigger value="stage">Funil por etapa</TabsTrigger>
          <TabsTrigger value="temperature">Por temperatura</TabsTrigger>
        </TabsList>

        <TabsContent value="stage" className="mt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-12">Carregando...</p>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
              <div className="flex gap-3 min-w-max md:grid md:grid-cols-3 lg:grid-cols-6 md:min-w-0">
                {STAGES.map((stage) => {
                  const list = byStage[stage];
                  return (
                    <div key={stage} className="w-64 md:w-auto shrink-0 flex flex-col">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                          {stageLabel[stage]}
                          {stage !== 'perdido' && stage !== 'convertido' && <ArrowRight className="w-3 h-3 opacity-40" />}
                        </h3>
                        <Badge variant="secondary" className="text-[10px]">{list.length}</Badge>
                      </div>
                      <div className={cn('flex-1 space-y-2 p-2 rounded-xl bg-muted/30 min-h-[120px]')}>
                        {list.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground text-center py-6">Vazio</p>
                        ) : (
                          list
                            .sort((a, b) => b.score - a.score)
                            .map(renderCard)
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="temperature" className="mt-4 space-y-4">
          {/* Conversão por origem */}
          <Card className="shadow-card border-0 bg-gradient-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" /> Conversão por origem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {bySource.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sem dados de leads ainda.</p>
              ) : (
                bySource.map((row) => (
                  <div key={row.source} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{row.source}</span>
                      <span className="text-muted-foreground">
                        {row.conv}/{row.total} · <span className="font-semibold text-foreground">{row.rate.toFixed(0)}%</span>
                      </span>
                    </div>
                    <Progress value={row.rate} className="h-2" />
                    <p className="text-xs text-muted-foreground">Pipeline: {brl(row.pipeline)}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-12">Carregando...</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              {(['hot', 'warm', 'cold'] as Temp[]).map((t) => {
                const list = t === 'hot' ? hot : t === 'warm' ? warm : cold;
                const cfg = tempConfig[t];
                const Icon = cfg.icon;
                return (
                  <Card key={t} className="shadow-card border-0 bg-gradient-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Icon className="w-4 h-4" /> Leads {cfg.label}s
                        <Badge variant="secondary">{list.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {list.length === 0 ? (
                        <p className="text-center py-8 text-sm text-muted-foreground">Sem leads</p>
                      ) : (
                        list.sort((a, b) => b.score - a.score).map(renderCard)
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* CRUD Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar lead' : 'Novo lead'}</DialogTitle>
            <DialogDescription>Preencha as informações do lead.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Origem</Label>
                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Campanha</Label>
                <Input value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Procedimento de interesse</Label>
              <Input value={form.procedure_interest} onChange={(e) => setForm({ ...form, procedure_interest: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Temperatura</Label>
                <Select value={form.temperature} onValueChange={(v: Temp) => setForm({ ...form, temperature: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hot">Quente</SelectItem>
                    <SelectItem value="warm">Morno</SelectItem>
                    <SelectItem value="cold">Frio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Etapa</Label>
                <Select value={form.stage} onValueChange={(v: Stage) => setForm({ ...form, stage: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => <SelectItem key={s} value={s}>{stageLabel[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Score</Label>
                <Input type="number" min="0" max="100" value={form.score} onChange={(e) => setForm({ ...form, score: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Ticket estimado (R$)</Label>
              <Input type="number" min="0" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-gradient-primary text-primary-foreground">
              {saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick schedule Dialog */}
      <Dialog open={!!scheduleLead} onOpenChange={(o) => !o && setScheduleLead(null)}>
        <DialogContent className="max-w-md">
          {scheduleLead && (
            <>
              <DialogHeader>
                <DialogTitle>Agendar avaliação</DialogTitle>
                <DialogDescription>
                  {scheduleLead.name} — {scheduleLead.phone ?? 'sem telefone'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Procedimento</Label>
                  <Select
                    value={scheduleForm.procedure_id}
                    onValueChange={(v) => {
                      const p = procedures.find((x) => x.id === v);
                      setScheduleForm({
                        ...scheduleForm,
                        procedure_id: v,
                        value: Number(p?.default_price ?? scheduleForm.value),
                      });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {procedures.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data e hora *</Label>
                  <Input
                    type="datetime-local"
                    value={scheduleForm.scheduled_at}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_at: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={scheduleForm.value}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, value: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea
                    rows={2}
                    value={scheduleForm.notes}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setScheduleLead(null)} disabled={scheduling}>
                  Cancelar
                </Button>
                <Button
                  onClick={confirmSchedule}
                  disabled={scheduling}
                  className="bg-gradient-primary text-primary-foreground"
                >
                  {scheduling ? 'Agendando...' : 'Agendar e avançar'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail / Histórico de conversas */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.name}</DialogTitle>
                <DialogDescription>
                  {detail.source}{detail.campaign ? ` · ${detail.campaign}` : ''} · {stageLabel[detail.stage]}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-background">
                  <p className="text-muted-foreground">Temperatura</p>
                  <p className="font-semibold">{tempConfig[detail.temperature].label}</p>
                </div>
                <div className="p-2 rounded-lg bg-background">
                  <p className="text-muted-foreground">Score</p>
                  <p className="font-semibold">{detail.score}</p>
                </div>
                <div className="p-2 rounded-lg bg-background">
                  <p className="text-muted-foreground">Ticket</p>
                  <p className="font-semibold">{brl(Number(detail.estimated_value))}</p>
                </div>
              </div>

              {canEdit && (
                <div className="space-y-2 p-3 rounded-lg border">
                  <Label className="text-xs">Registrar interação</Label>
                  <div className="flex gap-2">
                    <Select value={newChannel} onValueChange={setNewChannel}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="ligacao">Ligação</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="presencial">Presencial</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={newDir} onValueChange={(v: 'in' | 'out' | 'note') => setNewDir(v)}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="out">Enviada</SelectItem>
                        <SelectItem value="in">Recebida</SelectItem>
                        <SelectItem value="note">Nota</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    rows={2}
                    placeholder="Mensagem ou anotação..."
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                  />
                  <Button size="sm" onClick={addInteraction} className="bg-gradient-primary text-primary-foreground">
                    <Plus className="w-3 h-3 mr-1" /> Adicionar
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <History className="w-3 h-3" /> Histórico completo ({interactions.length})
                </Label>
                {interactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma interação registrada.</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {interactions.map((i) => (
                      <div
                        key={i.id}
                        className={cn(
                          'p-3 rounded-lg text-sm',
                          i.direction === 'in' && 'bg-muted',
                          i.direction === 'out' && 'bg-primary/10',
                          i.direction === 'note' && 'bg-warning/10 italic',
                        )}
                      >
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span className="capitalize">
                            {i.channel} · {i.direction === 'in' ? '↓ Recebida' : i.direction === 'out' ? '↑ Enviada' : 'Nota'}
                          </span>
                          <span>{new Date(i.created_at).toLocaleString('pt-BR')}</span>
                        </div>
                        <p>{i.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 flex-wrap">
                {canEdit && detail.stage !== 'convertido' && detail.stage !== 'perdido' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const l = detail;
                      setDetail(null);
                      openSchedule(l);
                    }}
                  >
                    <CalendarPlus className="w-4 h-4 mr-2" /> Agendar avaliação
                  </Button>
                )}
                {detail.phone && (
                  <Button variant="outline" asChild>
                    <a href={`https://wa.me/${detail.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                      <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                    </a>
                  </Button>
                )}
                <Button variant="outline" onClick={() => setDetail(null)}>Fechar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
