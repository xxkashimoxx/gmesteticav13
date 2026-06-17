import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Plug,
  Megaphone,
  BarChart3,
  MessageCircle,
  Users,
  Zap,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ExternalLink,
  Key,
} from 'lucide-react';
import { mockIntegrations } from '@/data/mockData';
import { StatCard } from '@/components/StatCard';
import type { Integration, IntegrationStatus } from '@/types';
import { cn } from '@/lib/utils';

const categoryConfig = {
  ads: { label: 'Tráfego Pago', icon: Megaphone },
  analytics: { label: 'Analytics & Pixel', icon: BarChart3 },
  messaging: { label: 'Mensageria', icon: MessageCircle },
  crm: { label: 'CRM', icon: Users },
  automation: { label: 'Automação', icon: Zap },
} as const;

const statusConfig: Record<
  IntegrationStatus,
  { label: string; icon: typeof CheckCircle2; chip: string }
> = {
  connected: {
    label: 'Conectado',
    icon: CheckCircle2,
    chip: 'bg-success text-success-foreground',
  },
  pending: {
    label: 'Pendente',
    icon: AlertCircle,
    chip: 'bg-warning text-warning-foreground',
  },
  disconnected: {
    label: 'Desconectado',
    icon: XCircle,
    chip: 'bg-muted text-muted-foreground',
  },
};

function IntegrationCard({ integration }: { integration: Integration }) {
  const cat = categoryConfig[integration.category];
  const st = statusConfig[integration.status];
  const CatIcon = cat.icon;
  const StIcon = st.icon;
  const connected = integration.status === 'connected';

  return (
    <Card className="shadow-card border-0 bg-gradient-card hover:shadow-elevated transition-smooth">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
              <CatIcon className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{integration.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{cat.label}</p>
            </div>
          </div>
          <Badge className={cn('gap-1 shrink-0', st.chip)}>
            <StIcon className="w-3 h-3" />
            {st.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{integration.description}</p>

        {integration.metric && (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-background">
            <span className="text-xs text-muted-foreground">
              {integration.metric.label}
            </span>
            <span className="text-sm font-semibold text-foreground">
              {integration.metric.value}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Switch defaultChecked={connected} />
            <span className="text-xs text-muted-foreground">Sincronização</span>
          </div>
          <Button
            size="sm"
            variant={connected ? 'outline' : 'default'}
            className={cn(
              'h-8 text-xs',
              !connected && 'bg-gradient-primary text-primary-foreground'
            )}
          >
            {connected ? (
              <>
                <ExternalLink className="w-3 h-3 mr-1" />
                Gerenciar
              </>
            ) : (
              <>
                <Key className="w-3 h-3 mr-1" />
                Conectar
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Integrations() {
  const total = mockIntegrations.length;
  const connected = mockIntegrations.filter((i) => i.status === 'connected').length;
  const pending = mockIntegrations.filter((i) => i.status === 'pending').length;

  const categories = (Object.keys(categoryConfig) as Array<keyof typeof categoryConfig>);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Integrações</h1>
          <p className="text-sm text-muted-foreground">
            Conecte tráfego pago, pixels e mensageria à agenda da clínica
          </p>
        </div>
        <Button className="bg-gradient-primary text-primary-foreground shadow-card w-full sm:w-auto">
          <Plug className="w-4 h-4 mr-2" />
          Nova Integração
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard
          title="Integrações"
          value={total.toString()}
          icon={Plug}
          className="border-l-4 border-l-primary"
        />
        <StatCard
          title="Conectadas"
          value={connected.toString()}
          icon={CheckCircle2}
          className="border-l-4 border-l-success"
        />
        <StatCard
          title="Pendentes"
          value={pending.toString()}
          icon={AlertCircle}
          className="border-l-4 border-l-warning"
        />
        <StatCard
          title="Eventos hoje"
          value="312"
          icon={Zap}
          className="border-l-4 border-l-accent"
        />
      </div>

      <Card className="shadow-card border-0 bg-gradient-primary">
        <CardContent className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="text-primary-foreground">
            <p className="font-semibold">Acesso do gestor de tráfego</p>
            <p className="text-sm opacity-90">
              Compartilhe um login dedicado com permissão somente para Integrações,
              Leads e Dashboard.
            </p>
          </div>
          <Button variant="secondary" className="w-full md:w-auto">
            <Key className="w-4 h-4 mr-2" />
            Gerar acesso
          </Button>
        </CardContent>
      </Card>

      {categories.map((cat) => {
        const items = mockIntegrations.filter((i) => i.category === cat);
        if (items.length === 0) return null;
        const Cfg = categoryConfig[cat];
        const Icon = Cfg.icon;
        return (
          <section key={cat} className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">{Cfg.label}</h2>
              <Badge variant="secondary">{items.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {items.map((i) => (
                <IntegrationCard key={i.id} integration={i} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
