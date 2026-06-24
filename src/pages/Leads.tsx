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
import {
  Flame,
  Thermometer,
  Snowflake,
  Plus,
  Search,
  MessageCircle,
  Calendar,
  TrendingUp,
  Users,
  Target,
  AlertTriangle,
  History,
  Pencil,
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

const STAGES: Stage[] = ['novo', 'contato', 'qualificado', 'agendamento', 'convertido', 'perdido'];
const stageLabel: Record<Stage, string> = {
  novo: 'Novo',
  contato: 'Em contato',
  qualificado: 'Qualificado',
  agendamento: 'Pronto p/ agendar',
  convertido: 'Convertido',
  perdido: 'Perdido',
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

export default function Leads() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointmentsCount, setAppointmentsCount] = useState({ total: 0, week: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('Todas');

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

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: ldata, error }, { count: total }, { count: week }] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('appointments').select('*', { count: 'exact', head: true }),
      supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_at', startOfWeek().toISOString()),
    ]);
    if (error) toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' });
    setLeads((ldata ?? []) as Lead[]);
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

  // Quentes sem contato (>2 dias sem last_contact_at)
  const hotIdle = hot.filter((l) => daysSince(l.last_contact_at) >= 2);

  // Conversões da semana (leads stage = convertido updated/created esta semana)
  const weekStart = startOfWeek();
  const weekConversions = leads.filter(
    (l) => l.stage === 'convertido' && new Date(l.created_at) >= weekStart,
  );

  // Taxa de agendamento = agendados (stage agendamento + convertido) / total leads
  const agendados = leads.filter((l) => l.stage === 'agendamento' || l.stage === 'convertido').length;
  const taxaAgendamento = leads.length ? Math.round((agendados / leads.length) * 100) : 0;

  // Conversão por origem
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

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Classificação, conversões e histórico de conversas
          </p>
        </div>
        {isAdmin && (
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

      {/* Kanban por temperatura */}
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
                    list
                      .sort((a, b) => b.score - a.score)
                      .map((l) => (
                        <div
                          key={l.id}
                          className={cn(
                            'p-4 rounded-xl bg-background border border-border shadow-card space-y-2',
                            cfg.ring,
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{l.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {l.source}{l.campaign ? ` · ${l.campaign}` : ''}
                              </p>
                            </div>
                            <Badge className={cn('shrink-0', cfg.chip)}>{cfg.label}</Badge>
                          </div>
                          <p className="text-sm">{l.procedure_interest ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{stageLabel[l.stage]}</p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Score</span>
                            <span className="font-semibold">{l.score}</span>
                          </div>
                          <Progress value={l.score} className="h-1.5" />
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Ticket</span>
                            <span className="font-semibold">{brl(Number(l.estimated_value))}</span>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => openDetail(l)}>
                              <History className="w-3 h-3 mr-1" /> Histórico
                            </Button>
                            {isAdmin && (
                              <Button size="sm" variant="outline" className="h-8" onClick={() => openEdit(l)}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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

              {isAdmin && (
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

              <DialogFooter>
                {detail.phone && (
                  <Button
                    variant="outline"
                    asChild
                  >
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
