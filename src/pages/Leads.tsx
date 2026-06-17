import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Flame,
  Thermometer,
  Snowflake,
  Plus,
  Search,
  Phone,
  MessageCircle,
  Calendar,
  TrendingUp,
  Users,
  Target,
} from 'lucide-react';
import { mockLeads } from '@/data/mockData';
import type { Lead, LeadTemperature } from '@/types';
import { StatCard } from '@/components/StatCard';
import { cn } from '@/lib/utils';

const temperatureConfig: Record<
  LeadTemperature,
  { label: string; icon: typeof Flame; ring: string; chip: string; dot: string }
> = {
  hot: {
    label: 'Quente',
    icon: Flame,
    ring: 'ring-2 ring-destructive/60',
    chip: 'bg-destructive text-destructive-foreground',
    dot: 'bg-destructive',
  },
  warm: {
    label: 'Morno',
    icon: Thermometer,
    ring: 'ring-2 ring-warning/60',
    chip: 'bg-warning text-warning-foreground',
    dot: 'bg-warning',
  },
  cold: {
    label: 'Frio',
    icon: Snowflake,
    ring: 'ring-2 ring-primary/40',
    chip: 'bg-primary text-primary-foreground',
    dot: 'bg-primary',
  },
};

const stageLabel: Record<Lead['stage'], string> = {
  novo: 'Novo',
  contato: 'Em contato',
  qualificado: 'Qualificado',
  agendamento: 'Pronto p/ agendar',
  convertido: 'Convertido',
  perdido: 'Perdido',
};

function LeadCard({ lead }: { lead: Lead }) {
  const cfg = temperatureConfig[lead.temperature];
  const Icon = cfg.icon;
  return (
    <div
      className={cn(
        'p-4 rounded-xl bg-background border border-border shadow-card hover:shadow-elevated transition-smooth space-y-3',
        cfg.ring
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{lead.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {lead.source}
            {lead.campaign ? ` · ${lead.campaign}` : ''}
          </p>
        </div>
        <Badge className={cn('shrink-0 gap-1', cfg.chip)}>
          <Icon className="w-3 h-3" />
          {cfg.label}
        </Badge>
      </div>

      <div>
        <p className="text-sm font-medium text-foreground line-clamp-1">
          {lead.procedureInterest}
        </p>
        <p className="text-xs text-muted-foreground">{stageLabel[lead.stage]}</p>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Score de conversão</span>
          <span className="font-semibold text-foreground">{lead.score}</span>
        </div>
        <Progress value={lead.score} className="h-1.5" />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Ticket estimado</span>
        <span className="font-semibold text-foreground">
          R$ {lead.estimatedValue.toLocaleString('pt-BR')}
        </span>
      </div>

      {lead.scheduledDate && (
        <div className="flex items-center gap-1 text-xs text-primary-foreground bg-primary px-2 py-1 rounded-md">
          <Calendar className="w-3 h-3" />
          Pré-agenda: {new Date(lead.scheduledDate).toLocaleDateString('pt-BR')}
        </div>
      )}

      {lead.notes && (
        <p className="text-xs text-muted-foreground line-clamp-2 italic">
          “{lead.notes}”
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs">
          <MessageCircle className="w-3 h-3 mr-1" />
          WhatsApp
        </Button>
        <Button
          size="sm"
          className="flex-1 h-8 text-xs bg-gradient-primary text-primary-foreground"
        >
          <Calendar className="w-3 h-3 mr-1" />
          Agendar
        </Button>
      </div>
    </div>
  );
}

function TemperatureColumn({
  temperature,
  leads,
}: {
  temperature: LeadTemperature;
  leads: Lead[];
}) {
  const cfg = temperatureConfig[temperature];
  const Icon = cfg.icon;
  const total = leads.reduce((s, l) => s + l.estimatedValue, 0);

  return (
    <Card className="shadow-card border-0 bg-gradient-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <span className={cn('w-2.5 h-2.5 rounded-full', cfg.dot)} />
            <Icon className="w-4 h-4 text-foreground" />
            Leads {cfg.label}s
            <Badge variant="secondary" className="ml-1">
              {leads.length}
            </Badge>
          </div>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Pipeline: R$ {total.toLocaleString('pt-BR')}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {leads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Sem leads nesta temperatura
          </div>
        ) : (
          leads
            .sort((a, b) => b.score - a.score)
            .map((lead) => <LeadCard key={lead.id} lead={lead} />)
        )}
      </CardContent>
    </Card>
  );
}

export default function Leads() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      mockLeads.filter(
        (l) =>
          l.name.toLowerCase().includes(search.toLowerCase()) ||
          l.procedureInterest.toLowerCase().includes(search.toLowerCase()) ||
          l.source.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );

  const hot = filtered.filter((l) => l.temperature === 'hot');
  const warm = filtered.filter((l) => l.temperature === 'warm');
  const cold = filtered.filter((l) => l.temperature === 'cold');

  const pipeline = filtered.reduce((s, l) => s + l.estimatedValue, 0);
  const conversionRate =
    filtered.length > 0
      ? ((hot.length / filtered.length) * 100).toFixed(0) + '%'
      : '0%';

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Detecção e classificação por temperatura
          </p>
        </div>
        <Button className="bg-gradient-primary text-primary-foreground shadow-card w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Novo Lead
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard
          title="Total de Leads"
          value={filtered.length.toString()}
          icon={Users}
          className="border-l-4 border-l-primary"
        />
        <StatCard
          title="Leads Quentes"
          value={hot.length.toString()}
          icon={Flame}
          className="border-l-4 border-l-destructive"
        />
        <StatCard
          title="Pipeline Estimado"
          value={`R$ ${pipeline.toLocaleString('pt-BR')}`}
          icon={TrendingUp}
          className="border-l-4 border-l-success"
        />
        <StatCard
          title="Taxa Quente"
          value={conversionRate}
          icon={Target}
          className="border-l-4 border-l-warning"
        />
      </div>

      <div className="relative flex-1 sm:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar lead, procedimento, origem..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <TemperatureColumn temperature="hot" leads={hot} />
        <TemperatureColumn temperature="warm" leads={warm} />
        <TemperatureColumn temperature="cold" leads={cold} />
      </div>

      <Card className="shadow-card border-0 bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Thermometer className="w-5 h-5 text-primary" />
            Como classificamos a temperatura
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-background">
            <Badge className="bg-destructive text-destructive-foreground mb-2">
              <Flame className="w-3 h-3 mr-1" /> Quente
            </Badge>
            <p className="text-muted-foreground">
              Score ≥ 80, respondeu nas últimas 48h e demonstrou intenção clara
              de agendar procedimento.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-background">
            <Badge className="bg-warning text-warning-foreground mb-2">
              <Thermometer className="w-3 h-3 mr-1" /> Morno
            </Badge>
            <p className="text-muted-foreground">
              Score 50–79, interagiu mas ainda compara preço, prazo ou
              procedimento.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-background">
            <Badge className="bg-primary text-primary-foreground mb-2">
              <Snowflake className="w-3 h-3 mr-1" /> Frio
            </Badge>
            <p className="text-muted-foreground">
              Score &lt; 50, baixa interação ou sem resposta — precisa de
              nutrição/remarketing.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
