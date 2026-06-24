import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatCard } from '@/components/StatCard';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import {
  Search,
  Clock,
  DollarSign,
  Sparkles,
  Plus,
  MoreVertical,
  Pencil,
  Archive,
  ArchiveRestore,
  Tag,
  Trophy,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { brl as brlFmt } from '@/lib/format';

interface Sale {
  id: string;
  procedure_id: string | null;
  procedure_name: string;
  value: number;
  sold_at: string;
}

interface Procedure {
  id: string;
  name: string;
  category: string;
  description: string | null;
  default_price: number;
  duration: string | null;
  sessions_recommended: number;
  highlight: string | null;
  archived: boolean;
}

const CATEGORIES = ['Harmonização', 'Toxina', 'Bioestimulador', 'Skincare', 'Tecnologia'] as const;
const FILTERS = ['Todos', ...CATEGORIES, 'Arquivados'] as const;
type Filter = (typeof FILTERS)[number];

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const emptyForm = {
  name: '',
  category: 'Harmonização' as string,
  description: '',
  default_price: '' as string | number,
  duration: '',
  sessions_recommended: 1,
  highlight: '',
};

export default function Procedures() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [items, setItems] = useState<Procedure[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('Todos');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Procedure | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [{ data, error }, { data: sdata }] = await Promise.all([
      supabase.from('procedures').select('*').order('created_at', { ascending: false }),
      supabase.from('procedure_sales').select('id,procedure_id,procedure_name,value,sold_at'),
    ]);
    if (error) {
      toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' });
    } else {
      setItems((data ?? []) as Procedure[]);
    }
    setSales((sdata ?? []) as Sale[]);
    setLoading(false);
  }

  const filtered = useMemo(
    () =>
      items.filter((p) => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
        if (!matchSearch) return false;
        if (filter === 'Todos') return !p.archived;
        if (filter === 'Arquivados') return p.archived;
        return !p.archived && p.category === filter;
      }),
    [items, search, filter],
  );

  const totals = useMemo(() => {
    const active = items.filter((p) => !p.archived);
    const avg = active.length
      ? active.reduce((s, p) => s + Number(p.default_price), 0) / active.length
      : 0;
    return {
      active: active.length,
      archived: items.length - active.length,
      categories: new Set(active.map((p) => p.category)).size,
      avg,
    };
  }, [items]);

  // Ranking de mais vendidos
  const ranking = useMemo(() => {
    const m = new Map<string, { name: string; count: number; revenue: number }>();
    for (const s of sales) {
      const key = s.procedure_id ?? s.procedure_name;
      const cur = m.get(key) ?? { name: s.procedure_name, count: 0, revenue: 0 };
      cur.count++;
      cur.revenue += Number(s.value);
      m.set(key, cur);
    }
    return Array.from(m.values()).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [sales]);

  // Receita prevista por mês (próximos 6 meses, baseado em média dos últimos 90 dias)
  const monthlyForecast = useMemo(() => {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const recent = sales.filter((s) => new Date(s.sold_at).getTime() >= cutoff);
    const monthlyAvg = recent.reduce((s, x) => s + Number(x.value), 0) / 3;
    const months: { label: string; value: number }[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({
        label: d.toLocaleDateString('pt-BR', { month: 'short' }),
        value: monthlyAvg,
      });
    }
    return { months, monthlyAvg };
  }, [sales]);

  const maxForecast = Math.max(1, ...monthlyForecast.months.map((m) => m.value));


  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(p: Procedure) {
    setEditing(p);
    setForm({
      name: p.name,
      category: p.category,
      description: p.description ?? '',
      default_price: Number(p.default_price),
      duration: p.duration ?? '',
      sessions_recommended: p.sessions_recommended,
      highlight: p.highlight ?? '',
    });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.name.trim() || !form.category) {
      toast({ title: 'Nome e categoria são obrigatórios', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim() || null,
      default_price: Number(form.default_price) || 0,
      duration: form.duration.trim() || null,
      sessions_recommended: Number(form.sessions_recommended) || 1,
      highlight: form.highlight.trim() || null,
    };

    const { error } = editing
      ? await supabase.from('procedures').update(payload).eq('id', editing.id)
      : await supabase.from('procedures').insert(payload);

    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editing ? 'Procedimento atualizado' : 'Procedimento criado' });
    setDialogOpen(false);
    load();
  }

  async function toggleArchive(p: Procedure) {
    const { error } = await supabase
      .from('procedures')
      .update({ archived: !p.archived })
      .eq('id', p.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: p.archived ? 'Procedimento restaurado' : 'Procedimento arquivado' });
      load();
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Procedimentos</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo de procedimentos da clínica
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={openCreate}
            className="bg-gradient-primary text-primary-foreground shadow-card w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" /> Novo procedimento
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard title="Ativos" value={totals.active.toString()} icon={Sparkles} className="border-l-4 border-l-primary" />
        <StatCard title="Categorias" value={totals.categories.toString()} icon={Tag} className="border-l-4 border-l-accent" />
        <StatCard title="Ticket médio" value={brl(totals.avg)} icon={DollarSign} className="border-l-4 border-l-success" />
        <StatCard title="Arquivados" value={totals.archived.toString()} icon={Archive} className="border-l-4 border-l-warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" /> Mais vendidos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ranking.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma venda registrada ainda.
              </p>
            ) : (
              ranking.map((r, i) => {
                const max = ranking[0].count;
                return (
                  <div key={r.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate">
                        #{i + 1} {r.name}
                      </span>
                      <span className="text-muted-foreground shrink-0">
                        {r.count}× · <span className="font-semibold text-foreground">{brlFmt(r.revenue)}</span>
                      </span>
                    </div>
                    <Progress value={(r.count / max) * 100} className="h-2" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Receita prevista por mês
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Projeção baseada na média dos últimos 90 dias: {brlFmt(monthlyForecast.monthlyAvg)}/mês
            </p>
          </CardHeader>
          <CardContent>
            {monthlyForecast.monthlyAvg === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Registre vendas para gerar a projeção.
              </p>
            ) : (
              <div className="flex items-end justify-between gap-2 h-40">
                {monthlyForecast.months.map((m) => (
                  <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-semibold">{brlFmt(m.value)}</span>
                    <div
                      className="w-full bg-gradient-primary rounded-t-md transition-all"
                      style={{ height: `${(m.value / maxForecast) * 100}%`, minHeight: '4px' }}
                    />
                    <span className="text-xs text-muted-foreground capitalize">{m.label}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>


      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar procedimento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((c) => (
            <Button
              key={c}
              size="sm"
              variant={filter === c ? 'default' : 'outline'}
              onClick={() => setFilter(c)}
              className={cn('shrink-0', filter === c && 'bg-gradient-primary text-primary-foreground')}
            >
              {c}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-12">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>Nenhum procedimento encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {filtered.map((p) => (
            <Card
              key={p.id}
              className={cn(
                'shadow-card border-0 bg-gradient-card hover:shadow-elevated transition-smooth',
                p.archived && 'opacity-60',
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      {p.highlight && (
                        <Badge className="bg-secondary text-secondary-foreground">{p.highlight}</Badge>
                      )}
                      {p.archived && <Badge variant="outline">Arquivado</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Tag className="w-3 h-3" /> {p.category}
                    </p>
                  </div>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(p)}>
                          <Pencil className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleArchive(p)}>
                          {p.archived ? (
                            <>
                              <ArchiveRestore className="w-4 h-4 mr-2" /> Restaurar
                            </>
                          ) : (
                            <>
                              <Archive className="w-4 h-4 mr-2" /> Arquivar
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-3 min-h-[3rem]">
                  {p.description || 'Sem descrição.'}
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-background">
                    <DollarSign className="w-3.5 h-3.5 mx-auto text-muted-foreground" />
                    <p className="text-[11px] text-muted-foreground mt-1">Valor</p>
                    <p className="text-xs font-semibold">{brl(Number(p.default_price))}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-background">
                    <Clock className="w-3.5 h-3.5 mx-auto text-muted-foreground" />
                    <p className="text-[11px] text-muted-foreground mt-1">Duração</p>
                    <p className="text-xs font-semibold">{p.duration || '—'}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-background">
                    <Sparkles className="w-3.5 h-3.5 mx-auto text-muted-foreground" />
                    <p className="text-[11px] text-muted-foreground mt-1">Sessões</p>
                    <p className="text-xs font-semibold">{p.sessions_recommended}x</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar procedimento' : 'Novo procedimento'}</DialogTitle>
            <DialogDescription>
              Defina nome, categoria, valor padrão e descrição.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: Preenchimento Labial"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria *</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="price">Valor padrão (R$) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.default_price}
                  onChange={(e) => setForm({ ...form, default_price: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="duration">Duração</Label>
                <Input
                  id="duration"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  placeholder="Ex.: 60 min"
                />
              </div>
              <div>
                <Label htmlFor="sessions">Sessões recomendadas</Label>
                <Input
                  id="sessions"
                  type="number"
                  min="1"
                  value={form.sessions_recommended}
                  onChange={(e) =>
                    setForm({ ...form, sessions_recommended: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="highlight">Destaque (opcional)</Label>
              <Input
                id="highlight"
                value={form.highlight}
                onChange={(e) => setForm({ ...form, highlight: e.target.value })}
                placeholder="Ex.: Mais procurado"
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Detalhes do procedimento..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={save}
              disabled={saving}
              className="bg-gradient-primary text-primary-foreground"
            >
              {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
