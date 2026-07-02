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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  User,
  DollarSign,
  MessageCircle,
  BellRing,
  Pencil,
} from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  buildWhatsAppUrl,
  TEMPLATE_LABELS,
  type WhatsAppTemplateKind,
  type AppointmentLike,
} from '@/lib/whatsapp';
import { brl } from '@/lib/format';

type Appointment = {
  id: string;
  patient_name: string;
  patient_phone: string | null;
  procedure_id: string | null;
  procedure_name: string | null;
  scheduled_at: string;
  previous_scheduled_at: string | null;
  status: string;
  value: number | null;
  notes: string | null;
  confirmation_sent_at: string | null;
  reminder_24h_sent_at: string | null;
  reminder_2h_sent_at: string | null;
  reschedule_notice_sent_at: string | null;
};

type ProcedureOption = {
  id: string;
  name: string;
  default_price: number | null;
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Agendado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Faltou',
};

function toLocalInputValue(iso?: string | null) {
  const d = iso ? new Date(iso) : new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

function fireWhatsApp(kind: WhatsAppTemplateKind, apt: AppointmentLike) {
  const url = buildWhatsAppUrl(kind, apt);
  if (!url) {
    toast({
      title: 'Sem número de WhatsApp',
      description: 'Cadastre o telefone da paciente para enviar a mensagem.',
      variant: 'destructive',
    });
    return false;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [procedures, setProcedures] = useState<ProcedureOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [creating, setCreating] = useState(false);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  async function load() {
    setLoading(true);
    const rangeStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
    const rangeEnd = addDays(rangeStart, 14);
    const [{ data: aptData }, { data: procData }] = await Promise.all([
      supabase
        .from('appointments')
        .select('*')
        .gte('scheduled_at', addDays(rangeStart, -1).toISOString())
        .lte('scheduled_at', rangeEnd.toISOString())
        .order('scheduled_at', { ascending: true }),
      supabase.from('procedures').select('id, name, default_value').eq('active', true),
    ]);
    setAppointments((aptData as Appointment[]) || []);
    setProcedures((procData as ProcedureOption[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate.toDateString()]);

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(
      (a) => new Date(a.scheduled_at).toDateString() === date.toDateString(),
    );
  };

  // Lembretes pendentes: próximos 26h (para 24h) e próximas 3h (para 2h)
  const pendingReminders = useMemo(() => {
    const now = Date.now();
    const items: Array<{ apt: Appointment; kind: WhatsAppTemplateKind }> = [];
    for (const a of appointments) {
      if (a.status !== 'scheduled') continue;
      const when = new Date(a.scheduled_at).getTime();
      const hoursTo = (when - now) / 3600000;
      if (hoursTo > 0 && hoursTo <= 26 && !a.reminder_24h_sent_at) {
        items.push({ apt: a, kind: 'reminder_24h' });
      }
      if (hoursTo > 0 && hoursTo <= 2.5 && !a.reminder_2h_sent_at) {
        items.push({ apt: a, kind: 'reminder_2h' });
      }
    }
    return items.sort(
      (x, y) =>
        new Date(x.apt.scheduled_at).getTime() - new Date(y.apt.scheduled_at).getTime(),
    );
  }, [appointments]);

  async function markSent(id: string, field: keyof Appointment) {
    await supabase
      .from('appointments')
      .update({ [field]: new Date().toISOString() } as never)
      .eq('id', id);
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: new Date().toISOString() } : a)),
    );
  }

  async function sendReminder(apt: Appointment, kind: WhatsAppTemplateKind) {
    if (!fireWhatsApp(kind, apt)) return;
    const field = kind === 'reminder_24h' ? 'reminder_24h_sent_at' : 'reminder_2h_sent_at';
    await markSent(apt.id, field);
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Agenda</h1>
        <Button
          onClick={() => setCreating(true)}
          className="bg-gradient-primary text-primary-foreground shadow-card w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      {/* Lembretes pendentes */}
      {pendingReminders.length > 0 && (
        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <BellRing className="w-5 h-5 text-primary" />
              Lembretes pendentes ({pendingReminders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingReminders.map(({ apt, kind }) => (
              <div
                key={`${apt.id}-${kind}`}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-background rounded-lg border border-border"
              >
                <div className="text-sm">
                  <div className="font-medium text-foreground">
                    {apt.patient_name}
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {TEMPLATE_LABELS[kind]}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(apt.scheduled_at), "EEE, dd/MM 'às' HH:mm", {
                      locale: ptBR,
                    })}{' '}
                    · {apt.procedure_name}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => sendReminder(apt, kind)}
                  className="bg-[#25D366] hover:bg-[#1FB855] text-white"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Enviar WhatsApp
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Week nav */}
      <Card className="shadow-card border-0 bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 text-base md:text-lg">
              <CalendarIcon className="w-5 h-5 text-primary" />
              <span className="truncate">
                Semana de {format(weekStart, "dd 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(addDays(selectedDate, -7))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
              >
                Hoje
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(addDays(selectedDate, 7))}
              >
                Próxima
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Week grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 md:gap-4">
        {weekDays.map((day, index) => {
          const dayAppointments = getAppointmentsForDate(day);
          const isToday = day.toDateString() === new Date().toDateString();
          return (
            <Card
              key={index}
              className={`shadow-card border-0 bg-gradient-card ${
                isToday ? 'ring-2 ring-primary' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-center">
                  <div className="text-sm text-muted-foreground">
                    {format(day, 'EEEE', { locale: ptBR })}
                  </div>
                  <div
                    className={`text-lg font-bold ${
                      isToday ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {format(day, 'dd')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {dayAppointments.length} agendamento
                    {dayAppointments.length !== 1 ? 's' : ''}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? null : dayAppointments.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Sem agendamentos</p>
                  </div>
                ) : (
                  dayAppointments.map((apt) => (
                    <button
                      key={apt.id}
                      onClick={() => setEditing(apt)}
                      className="w-full text-left p-3 bg-background rounded-lg border border-border hover:shadow-card transition-smooth"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="text-sm font-medium text-foreground">
                          {format(new Date(apt.scheduled_at), 'HH:mm')}
                        </div>
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <User className="w-3 h-3 mr-1 text-muted-foreground" />
                          <span className="font-medium text-foreground">
                            {apt.patient_name}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {apt.procedure_name}
                        </p>
                        {apt.value ? (
                          <div className="flex items-center text-xs text-primary">
                            <DollarSign className="w-3 h-3 mr-1" />
                            {brl(Number(apt.value))}
                          </div>
                        ) : null}
                        <Badge className="text-xs" variant="secondary">
                          {STATUS_LABEL[apt.status] || apt.status}
                        </Badge>
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {creating && (
        <AppointmentDialog
          open={creating}
          onOpenChange={setCreating}
          procedures={procedures}
          onSaved={load}
        />
      )}
      {editing && (
        <AppointmentDialog
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
          procedures={procedures}
          appointment={editing}
          onSaved={load}
        />
      )}
    </div>
  );
}

function AppointmentDialog({
  open,
  onOpenChange,
  procedures,
  appointment,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  procedures: ProcedureOption[];
  appointment?: Appointment;
  onSaved: () => void;
}) {
  const isEdit = !!appointment;
  const [patientName, setPatientName] = useState(appointment?.patient_name || '');
  const [patientPhone, setPatientPhone] = useState(appointment?.patient_phone || '');
  const [procedureId, setProcedureId] = useState(appointment?.procedure_id || '');
  const [scheduledAt, setScheduledAt] = useState(toLocalInputValue(appointment?.scheduled_at));
  const [status, setStatus] = useState(appointment?.status || 'scheduled');
  const [notes, setNotes] = useState(appointment?.notes || '');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!patientName.trim() || !scheduledAt || !procedureId) {
      toast({
        title: 'Preencha os campos obrigatórios',
        description: 'Nome, procedimento e data/hora são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    const proc = procedures.find((p) => p.id === procedureId);
    const newScheduledAt = new Date(scheduledAt).toISOString();

    if (isEdit && appointment) {
      const scheduleChanged =
        new Date(appointment.scheduled_at).getTime() !== new Date(newScheduledAt).getTime();
      const cancelled = status === 'cancelled' && appointment.status !== 'cancelled';

      const payload: Record<string, unknown> = {
        patient_name: patientName.trim(),
        patient_phone: patientPhone.trim() || null,
        procedure_id: procedureId,
        procedure_name: proc?.name || null,
        scheduled_at: newScheduledAt,
        status,
        value: proc?.default_value ?? appointment.value,
        notes: notes.trim() || null,
      };
      if (scheduleChanged) {
        payload.previous_scheduled_at = appointment.scheduled_at;
        payload.reminder_24h_sent_at = null;
        payload.reminder_2h_sent_at = null;
      }

      const { error } = await supabase
        .from('appointments')
        .update(payload)
        .eq('id', appointment.id);
      setSaving(false);
      if (error) {
        toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
        return;
      }

      const aptForMsg: AppointmentLike = {
        patient_name: patientName,
        patient_phone: patientPhone,
        procedure_name: proc?.name || null,
        scheduled_at: newScheduledAt,
        previous_scheduled_at: appointment.scheduled_at,
      };

      if (cancelled) {
        const sent = fireWhatsApp('cancellation', aptForMsg);
        if (sent) {
          await supabase
            .from('appointments')
            .update({ reschedule_notice_sent_at: new Date().toISOString() })
            .eq('id', appointment.id);
        }
      } else if (scheduleChanged) {
        const sent = fireWhatsApp('reschedule', aptForMsg);
        if (sent) {
          await supabase
            .from('appointments')
            .update({ reschedule_notice_sent_at: new Date().toISOString() })
            .eq('id', appointment.id);
        }
      }
      toast({ title: 'Agendamento atualizado' });
    } else {
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          patient_name: patientName.trim(),
          patient_phone: patientPhone.trim() || null,
          procedure_id: procedureId,
          procedure_name: proc?.name || null,
          scheduled_at: newScheduledAt,
          status: 'scheduled',
          value: proc?.default_value ?? null,
          notes: notes.trim() || null,
        })
        .select()
        .single();
      setSaving(false);
      if (error || !data) {
        toast({
          title: 'Erro ao criar',
          description: error?.message || 'Falha ao criar agendamento.',
          variant: 'destructive',
        });
        return;
      }
      const sent = fireWhatsApp('confirmation', {
        patient_name: patientName,
        patient_phone: patientPhone,
        procedure_name: proc?.name || null,
        scheduled_at: newScheduledAt,
      });
      if (sent) {
        await supabase
          .from('appointments')
          .update({ confirmation_sent_at: new Date().toISOString() })
          .eq('id', data.id);
      }
      toast({
        title: 'Agendamento criado',
        description: sent
          ? 'Mensagem de confirmação aberta no WhatsApp.'
          : 'Cadastre o telefone para enviar a confirmação por WhatsApp.',
      });
    }
    onSaved();
    onOpenChange(false);
  }

  const previewApt: AppointmentLike = {
    patient_name: patientName || 'paciente',
    patient_phone: patientPhone,
    procedure_name: procedures.find((p) => p.id === procedureId)?.name || null,
    scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
    previous_scheduled_at: appointment?.scheduled_at,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar agendamento' : 'Novo agendamento'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Paciente *</Label>
            <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} />
          </div>
          <div>
            <Label>WhatsApp (com DDD)</Label>
            <Input
              value={patientPhone}
              onChange={(e) => setPatientPhone(e.target.value)}
              placeholder="(51) 99999-9999"
            />
          </div>
          <div>
            <Label>Procedimento *</Label>
            <Select value={procedureId} onValueChange={setProcedureId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o procedimento" />
              </SelectTrigger>
              <SelectContent>
                {procedures.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data e horário *</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
          {isEdit && (
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Agendado</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                  <SelectItem value="no_show">Faltou</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          {isEdit && (
            <div className="pt-2 border-t space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                Enviar WhatsApp manualmente
              </div>
              <div className="flex flex-wrap gap-2">
                {(['confirmation', 'reminder_24h', 'reminder_2h', 'reschedule', 'cancellation'] as WhatsAppTemplateKind[]).map(
                  (k) => (
                    <Button
                      key={k}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fireWhatsApp(k, previewApt)}
                    >
                      <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                      {TEMPLATE_LABELS[k]}
                    </Button>
                  ),
                )}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar e enviar WhatsApp'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
