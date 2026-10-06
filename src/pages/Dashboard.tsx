import { useEffect, useState } from 'react';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Users, DollarSign, TrendingUp, Clock, Target, Flame, Globe, MousePointerClick, CalendarCheck, MessageCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { brl, startOfWeek } from '@/lib/format';
import { Button } from '@/components/ui/button';

interface Lead {
  id: string;
  name: string;
  stage: string;
  temperature: string;
  estimated_value: number;
  source: string;
  created_at: string;
}
interface Appointment {
  id: string;
  patient_name: string;
  procedure_name: string | null;
  scheduled_at: string;
  status: string;
  value: number;
}

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [landingMetrics, setLandingMetrics] = useState<{
    pageViews: number; bookingRequests: number; ctaClicks: number; whatsappClicks: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const metricQuery = (eventType: string) =>
        (supabase as any).from('landing_page_events').select('id', { count: 'exact', head: true })
          .eq('event_type', eventType).gte('created_at', since);
      const [leadsResult, appointmentsResult, views, requests, clicks, whatsapp] = await Promise.all([
        supabase.from('leads').select('id,name,stage,temperature,estimated_value,source,created_at'),
        supabase.from('appointments').select('*').order('scheduled_at', { ascending: true }),
        metricQuery('page_view'),
        metricQuery('booking_request'),
        metricQuery('cta_click'),
        metricQuery('whatsapp_click'),
      ]);
      setLeads((leadsResult.data ?? []) as Lead[]);
      setAppointments((appointmentsResult.data ?? []) as Appointment[]);
      if (![views, requests, clicks, whatsapp].some((result) => result.error)) {
        setLandingMetrics({
          pageViews: views.count ?? 0,
          bookingRequests: requests.count ?? 0,
          ctaClicks: clicks.count ?? 0,
          whatsappClicks: whatsapp.count ?? 0,
        });
      }
    })();
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const weekStart = startOfWeek();

  const todayAppointments = appointments.filter(
    (a) => a.scheduled_at.split('T')[0] === today,
  ).length;

  const weekConversions = leads.filter(
    (l) => l.stage === 'convertido' && new Date(l.created_at) >= weekStart,
  ).length;

  const agendados = leads.filter((l) => l.stage === 'agendamento' || l.stage === 'convertido').length;
  const taxaAgendamento = leads.length ? Math.round((agendados / leads.length) * 100) : 0;

  // Receita prevista: hot+warm leads pipeline + agendamentos futuros não cancelados
  const futureRevenue = appointments
    .filter((a) => new Date(a.scheduled_at) >= new Date() && a.status !== 'cancelled')
    .reduce((s, a) => s + Number(a.value), 0);
  const leadPipeline = leads
    .filter((l) => l.temperature !== 'cold' && l.stage !== 'perdido' && l.stage !== 'convertido')
    .reduce((s, l) => s + Number(l.estimated_value), 0);
  const receitaPrevista = futureRevenue + leadPipeline;

  const hotLeads = leads.filter((l) => l.temperature === 'hot').length;

  const upcoming = appointments
    .filter((a) => new Date(a.scheduled_at) >= new Date() && a.status === 'scheduled')
    .slice(0, 5);

  return (
    <div className="p-4 md:p-6 lg:px-8 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <a href="https://landing-page-gm-two.vercel.app/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" /> Ver landing page
            </a>
          </Button>
          <div className="text-xs sm:text-sm text-muted-foreground">
          {new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
          </div>
        </div>
      </div>

      <Card className="shadow-card border border-accent/25 bg-gradient-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-accent" /> Métricas da landing page
            </CardTitle>
            <span className="text-xs text-muted-foreground">Últimos 30 dias · após autorização de medição</span>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="Acessos" value={landingMetrics?.pageViews.toLocaleString('pt-BR') ?? '—'} icon={Globe} />
          <StatCard title="Solicitações de agendamento" value={landingMetrics?.bookingRequests.toLocaleString('pt-BR') ?? '—'} icon={CalendarCheck} />
          <StatCard title="Cliques em CTAs e links" value={landingMetrics?.ctaClicks.toLocaleString('pt-BR') ?? '—'} icon={MousePointerClick} />
          <StatCard title="Cliques no WhatsApp" value={landingMetrics?.whatsappClicks.toLocaleString('pt-BR') ?? '—'} icon={MessageCircle} />
        </CardContent>
        <p className="px-6 pb-4 text-xs text-muted-foreground">Solicitações abrem uma conversa no WhatsApp; não representam agendamentos confirmados.</p>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard
          title="Conversões na semana"
          value={weekConversions.toString()}
          icon={TrendingUp}
        />
        <StatCard
          title="Taxa de Agendamento"
          value={`${taxaAgendamento}%`}
          icon={Target}
        />
        <StatCard
          title="Receita Prevista"
          value={brl(receitaPrevista)}
          icon={DollarSign}
        />
        <StatCard
          title="Agendamentos Hoje"
          value={todayAppointments.toString()}
          icon={CalendarDays}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard title="Total de Leads" value={leads.length.toString()} icon={Users} />
        <StatCard title="Leads Quentes" value={hotLeads.toString()} icon={Flame} />
        <StatCard
          title="Pipeline de Leads"
          value={brl(leadPipeline)}
          icon={TrendingUp}
        />
        <StatCard
          title="Receita Agendada"
          value={brl(futureRevenue)}
          icon={DollarSign}
        />
      </div>

      <Card className="shadow-card border-0 bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Próximos Agendamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum agendamento futuro.</p>
          ) : (
            upcoming.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-background rounded-lg gap-3 min-w-0">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{a.patient_name}</p>
                  <p className="text-sm text-muted-foreground truncate">{a.procedure_name ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.scheduled_at).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant="secondary" className="mb-1">Agendado</Badge>
                  {Number(a.value) > 0 && (
                    <p className="text-sm font-medium text-primary">{brl(Number(a.value))}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
