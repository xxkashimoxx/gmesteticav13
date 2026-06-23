import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { StatCard } from '@/components/StatCard';
import { procedureCatalog, type ProcedureCatalogItem } from '@/data/procedures';
import { Search, Clock, TrendingUp, Users, DollarSign, Sparkles, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const categories = ['Todos', 'Harmonização', 'Toxina', 'Bioestimulador', 'Skincare', 'Tecnologia'] as const;
type Cat = typeof categories[number];

export default function Procedures() {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState<Cat>('Todos');
  const [selected, setSelected] = useState<ProcedureCatalogItem | null>(null);

  const filtered = useMemo(
    () =>
      procedureCatalog.filter((p) => {
        const okCat = cat === 'Todos' || p.category === cat;
        const okSearch = p.name.toLowerCase().includes(search.toLowerCase());
        return okCat && okSearch;
      }),
    [search, cat]
  );

  const totals = useMemo(() => {
    const bookings = procedureCatalog.reduce((s, p) => s + p.monthlyBookings, 0);
    const leads = procedureCatalog.reduce((s, p) => s + p.monthlyLeads, 0);
    const revenue = procedureCatalog.reduce((s, p) => s + p.revenueMonth, 0);
    const conv = (bookings / leads) * 100;
    return { bookings, leads, revenue, conv };
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Procedimentos</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo, métricas e performance de cada procedimento
          </p>
        </div>
        <Button className="bg-gradient-primary text-primary-foreground shadow-card w-full sm:w-auto">
          <Sparkles className="w-4 h-4 mr-2" />
          Novo procedimento
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard title="Procedimentos" value={procedureCatalog.length.toString()} icon={Sparkles} className="border-l-4 border-l-primary" />
        <StatCard title="Agendamentos/mês" value={totals.bookings.toString()} icon={Calendar} className="border-l-4 border-l-accent" />
        <StatCard title="Leads/mês" value={totals.leads.toString()} icon={Users} className="border-l-4 border-l-warning" />
        <StatCard title="Receita/mês" value={brl(totals.revenue)} icon={DollarSign} className="border-l-4 border-l-success" />
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
          {categories.map((c) => (
            <Button
              key={c}
              size="sm"
              variant={cat === c ? 'default' : 'outline'}
              onClick={() => setCat(c)}
              className={cn('shrink-0', cat === c && 'bg-gradient-primary text-primary-foreground')}
            >
              {c}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {filtered.map((p) => {
          const Icon = p.icon;
          return (
            <Card
              key={p.id}
              className="shadow-card border-0 bg-gradient-card hover:shadow-elevated transition-smooth cursor-pointer"
              onClick={() => setSelected(p)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{p.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{p.category}</p>
                    </div>
                  </div>
                  {p.highlight && (
                    <Badge className="bg-secondary text-secondary-foreground shrink-0">{p.highlight}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-background">
                    <Clock className="w-3.5 h-3.5 mx-auto text-muted-foreground" />
                    <p className="text-[11px] text-muted-foreground mt-1">Duração</p>
                    <p className="text-xs font-semibold">{p.duration}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-background">
                    <DollarSign className="w-3.5 h-3.5 mx-auto text-muted-foreground" />
                    <p className="text-[11px] text-muted-foreground mt-1">Valor</p>
                    <p className="text-xs font-semibold">{brl(p.price)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-background">
                    <TrendingUp className="w-3.5 h-3.5 mx-auto text-muted-foreground" />
                    <p className="text-[11px] text-muted-foreground mt-1">Conv.</p>
                    <p className="text-xs font-semibold">{p.conversionRate.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
                  <span>{p.monthlyLeads} leads/mês</span>
                  <span className="font-semibold text-foreground">{p.monthlyBookings} agendados</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <selected.icon className="w-5 h-5 text-primary" />
                  {selected.name}
                </DialogTitle>
                <DialogDescription>{selected.category} · {selected.duration}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{selected.description}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Valor</p>
                    <p className="text-lg font-bold">{brl(selected.price)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Sessões</p>
                    <p className="text-lg font-bold">{selected.sessionsRecommended}x</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Leads/mês</p>
                    <p className="text-lg font-bold">{selected.monthlyLeads}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Agendamentos/mês</p>
                    <p className="text-lg font-bold">{selected.monthlyBookings}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Conversão</p>
                    <p className="text-lg font-bold">{selected.conversionRate.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Receita/mês</p>
                    <p className="text-lg font-bold">{brl(selected.revenueMonth)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 bg-gradient-primary text-primary-foreground">
                    <Calendar className="w-4 h-4 mr-2" /> Agendar
                  </Button>
                  <Button variant="outline" className="flex-1">Editar</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
