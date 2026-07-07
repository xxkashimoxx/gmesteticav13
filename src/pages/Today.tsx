import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  Clock,
  Phone,
  MessageCircle,
  CheckCircle2,
  UserCheck,
  Play,
  DollarSign,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  BellRing,
  Cake,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { brl } from '@/lib/format';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'paid'
  | 'no_show'
  | 'cancelled';

type Appointment = {
  id: string;
  patient_name: string;
  patient_phone: string | null;
  procedure_name: string | null;
  scheduled_at: string;
  status: AppointmentStatus;
  value: number | null;
  notes: string | null;
  checked_in_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  paid_at: string | null;
  confirmation_sent_at: string | null;
  reminder_24h_sent_at: string | null;
  reminder_2h_sent_at: string | null;
};

const STATUS_META: Record<
  AppointmentStatus,
  { label: string; chip: string; dot: string }
> = {
  scheduled: { label: 'Agendado', chip: 'bg-muted text-foreground', dot: 'bg-muted-foreground' },
  confirmed: { label: 'Confirmado', chip: 'bg-primary/15 text-primary', dot: 'bg-primary' },
  arrived: { label: 'Chegou', chip: 'bg-accent/20 text-accent-foreground', dot: 'bg-accent' },
  in_progress: { label: 'Em atendimento', chip: 'bg-warning/20 text-warning-foreground', dot: 'bg-warning' },
  completed: { label: 'Concluído', chip: 'bg-success/15 text-success', dot: 'bg-success' },
  paid: { label: 'Pago', chip: 'bg-success text-success-foreground', dot: 'bg-success' },
  no_show: { label: 'Faltou', chip: 'bg-destructive/20 text-destructive', dot: 'bg-destructive' },
  cancelled: { label: 'Cancelado', chip: 'bg-muted text-muted-foreground line-through', dot: 'bg-muted-foreground' },
};

const NEXT_ACTION: Record<AppointmentStatus, { next: AppointmentStatus; label: string; icon: typeof CheckCircle2 } | null> = {
  scheduled: { next: 'confirmed', label: 'Confirmar', icon: CheckCircle2 },
  confirmed: { next: 'arrived', label: 'Marcar chegada', icon: UserCheck },
  arrived: { next: 'in_progress', label: 'Iniciar atendimento', icon: Play },
  in_progress: { next: 'completed', label: 'Concluir', icon: CheckCircle2 },
  completed: { next: 'paid', label: 'Registrar pagamento', icon: DollarSign },
  paid: null,
  no_show: null,
  cancelled: null,
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function Today() {
  const navigate = useNavigate();
  const [day, setDay] = useState<Date>(() => startOfDay(new Date()));
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const isToday = startOfDay(new Date()).getTime() === day.getTime();

  async function load() {
    setLoading(true);
    const from = day.toISOString();
    const to = addDays(day, 1).toISOString();
    const { data, error } = await supabase
      .from('appointments')
      .select(
        'id, patient_name, patient_phone, procedure_name, scheduled_at, status, value, notes, checked_in_at, started_at, finished_at, paid_at, confirmation_sent_at, reminder_24h_sent_at, reminder_2h_sent_at',
      )
      .gte('scheduled_at', from)
      .lt('scheduled_at', to)
      .order('scheduled_at', { ascending: true });
    if (error) {
      toast.error('Não foi possível carregar a agenda', { description: error.message });
    } else {
      setItems((data ?? []) as Appointment[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.getTime()]);

  const stats = useMemo(() => {
    const total = items.length;
    const confirmed = items.filter((i) =>
      ['confirmed', 'arrived', 'in_progress', 'completed', 'paid'].includes(i.status),
    ).length;
    const done = items.filter((i) => ['completed', 'paid'].includes(i.status)).length;
    const expected = items.reduce((s, i) => s + (i.value ?? 0), 0);
    const collected = items
      .filter((i) => i.status === 'paid')
      .reduce((s, i) => s + (i.value ?? 0), 0);
    return { total, confirmed, done, expected, collected };
  }, [items]);

  async function advance(apt: Appointment) {
    const action = NEXT_ACTION[apt.status];
    if (!action) return;
    setSavingId(apt.id);
    const now = new Date().toISOString();
    const patch: Database['public']['Tables']['appointments']['Update'] = { status: action.next };
    if (action.next === 'arrived') patch.checked_in_at = now;
    if (action.next === 'in_progress') patch.started_at = now;
    if (action.next === 'completed') patch.finished_at = now;
    if (action.next === 'paid') patch.paid_at = now;
    const { error } = await supabase.from('appointments').update(patch).eq('id', apt.id);
    setSavingId(null);
    if (error) return toast.error('Falha ao atualizar', { description: error.message });
    toast.success(`${apt.patient_name}: ${action.label.toLowerCase()}`);
    load();
  }

  async function setStatus(apt: Appointment, status: AppointmentStatus) {
    setSavingId(apt.id);
    const { error } = await supabase.from('appointments').update({ status }).eq('id', apt.id);
    setSavingId(null);
    if (error) return toast.error('Falha ao atualizar', { description: error.message });
    load();
  }

  function openWhatsApp(apt: Appointment, kind: 'confirmation' | 'reminder_24h' | 'reminder_2h') {
    const url = buildWhatsAppUrl(kind, {
      patient_name: apt.patient_name,
      patient_phone: apt.patient_phone,
      procedure_name: apt.procedure_name,
      scheduled_at: apt.scheduled_at,
    });
    if (!url) return toast.error('Paciente sem telefone cadastrado');
    window.open(url, '_blank', 'noopener');
    const stamp = new Date().toISOString();
    const patch: Database['public']['Tables']['appointments']['Update'] =
      kind === 'confirmation'
        ? { confirmation_sent_at: stamp }
        : kind === 'reminder_24h'
        ? { reminder_24h_sent_at: stamp }
        : { reminder_2h_sent_at: stamp };
    supabase.from('appointments').update(patch).eq('id', apt.id).then(() => load());
  }

  const dayLabel = format(day, "EEEE, dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground capitalize">
            {isToday ? 'Hoje' : dayLabel}
          </h1>
          <p className="text-sm text-muted-foreground capitalize">{dayLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setDay(addDays(day, -1))} aria-label="Dia anterior">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={() => setDay(startOfDay(new Date()))}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={() => setDay(addDays(day, 1))} aria-label="Próximo dia">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => navigate('/schedule')}
            className="bg-gradient-primary text-primary-foreground shadow-card"
          >
            <CalendarIcon className="w-4 h-4 mr-2" />
            Agenda completa
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard title="Agendamentos" value={stats.total.toString()} icon={CalendarIcon} className="border-l-4 border-l-primary" />
        <StatCard title="Confirmados" value={`${stats.confirmed}/${stats.total || 0}`} icon={CheckCircle2} className="border-l-4 border-l-accent" />
        <StatCard title="Concluídos" value={stats.done.toString()} icon={UserCheck} className="border-l-4 border-l-success" />
        <StatCard title="Recebido / Previsto" value={`${brl(stats.collected)} / ${brl(stats.expected)}`} icon={DollarSign} className="border-l-4 border-l-warning" />
      </div>

      <Card className="shadow-card border-0 bg-gradient-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="w-5 h-5 text-primary" />
            Linha do tempo do dia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <div className="text-sm text-muted-foreground py-8 text-center">Carregando…</div>}
          {!loading && items.length === 0 && (
            <div className="py-10 text-center space-y-3">
              <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum agendamento para este dia.</p>
              <Button onClick={() => navigate('/schedule')} variant="outline">
                Abrir agenda
              </Button>
            </div>
          )}
          {items.map((apt) => {
            const meta = STATUS_META[apt.status];
            const action = NEXT_ACTION[apt.status];
            const time = format(new Date(apt.scheduled_at), 'HH:mm');
            const isTerminal = apt.status === 'paid' || apt.status === 'no_show' || apt.status === 'cancelled';
            return (
              <div
                key={apt.id}
                className={cn(
                  'rounded-xl border border-border bg-background p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-3',
                  isTerminal && 'opacity-70',
                )}
              >
                <div className="flex items-center gap-3 md:w-40 shrink-0">
                  <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', meta.dot)} />
                  <div>
                    <p className="text-lg font-bold text-foreground leading-none">{time}</p>
                    <Badge className={cn('mt-1 text-[10px]', meta.chip)}>{meta.label}</Badge>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{apt.patient_name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {apt.procedure_name ?? 'Procedimento não definido'}
                    {apt.value ? ` · ${brl(apt.value)}` : ''}
                  </p>
                  {apt.notes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{apt.notes}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
                  {apt.patient_phone && (
                    <>
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label="Ligar"
                        asChild
                        className="h-8 w-8"
                      >
                        <a href={`tel:${apt.patient_phone}`}>
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label="WhatsApp confirmação"
                        className="h-8 w-8 text-[#25D366] hover:text-[#25D366]"
                        onClick={() => openWhatsApp(apt, 'confirmation')}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                  {action && (
                    <Button
                      size="sm"
                      onClick={() => advance(apt)}
                      disabled={savingId === apt.id}
                      className="h-8 bg-gradient-primary text-primary-foreground"
                    >
                      <action.icon className="w-3.5 h-3.5 mr-1" />
                      {action.label}
                    </Button>
                  )}
                  {!isTerminal && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-destructive hover:text-destructive"
                      onClick={() => setStatus(apt, apt.status === 'scheduled' || apt.status === 'confirmed' ? 'no_show' : 'cancelled')}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      {apt.status === 'scheduled' || apt.status === 'confirmed' ? 'Faltou' : 'Cancelar'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BellRing className="w-5 h-5 text-primary" />
              Lembretes de WhatsApp pendentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {items.filter((i) => !i.reminder_2h_sent_at && ['scheduled', 'confirmed'].includes(i.status)).length === 0 && (
              <p className="text-muted-foreground text-sm">Tudo em dia.</p>
            )}
            {items
              .filter((i) => !i.reminder_2h_sent_at && ['scheduled', 'confirmed'].includes(i.status))
              .map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background border border-border">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{i.patient_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(i.scheduled_at), 'HH:mm')} · {i.procedure_name ?? '—'}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openWhatsApp(i, 'reminder_2h')}>
                    <MessageCircle className="w-3.5 h-3.5 mr-1" />
                    Enviar
                  </Button>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Atenção
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p className="flex items-center gap-2">
              <Cake className="w-4 h-4" />
              Aniversariantes do dia aparecerão aqui quando pacientes tiverem data de nascimento cadastrada.
            </p>
            <p>Faltas da semana e retornos sugeridos serão exibidos na próxima iteração.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
