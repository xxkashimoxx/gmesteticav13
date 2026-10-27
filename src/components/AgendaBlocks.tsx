import { useCallback, useEffect, useState } from 'react';
import { CalendarOff, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useClinicSettings } from '@/hooks/useClinicSettings';
import type { Json } from '@/integrations/supabase/types';

type Block = Database['public']['Tables']['agenda_blocks']['Row'];

const TZ = 'America/Sao_Paulo';
const todayInClinic = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
const weekdays = [
  ['mon', 'Segunda'], ['tue', 'Terça'], ['wed', 'Quarta'], ['thu', 'Quinta'],
  ['fri', 'Sexta'], ['sat', 'Sábado'], ['sun', 'Domingo'],
] as const;
type Hours = Record<string, { enabled: boolean; start: string; end: string }>;
const emptyHours = (): Hours => Object.fromEntries(weekdays.map(([key]) => [
  key, { enabled: false, start: '09:00', end: '18:00' },
]));

function formatDay(ymd: string) {
  const [y, m, d] = ymd.split('-');
  const weekday = new Date(`${ymd}T12:00:00-03:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    timeZone: TZ,
  });
  return `${weekday}, ${d}/${m}/${y}`;
}

export function AgendaBlocks() {
  const { settings, loading: settingsLoading, upsert } = useClinicSettings();
  const [hours, setHours] = useState<Hours>(emptyHours);
  const [hoursSaving, setHoursSaving] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('12:00');
  const [reason, setReason] = useState('');

  const publicLink = `${window.location.origin}/disponibilidade`;

  useEffect(() => {
    if (!settings) return;
    const stored = settings.working_hours as Record<string, Partial<Hours[string]>> | null;
    const next = emptyHours();
    for (const [key] of weekdays) {
      const day = stored?.[key];
      if (day) next[key] = {
        enabled: day.enabled === true,
        start: typeof day.start === 'string' ? day.start : '09:00',
        end: typeof day.end === 'string' ? day.end : '18:00',
      };
    }
    setHours(next);
  }, [settings]);

  async function saveHours() {
    if (!Object.values(hours).some((day) => day.enabled)) {
      toast.error('Ative pelo menos um dia de atendimento.');
      return;
    }
    if (Object.values(hours).some((day) => day.enabled && (!day.start || !day.end || day.end <= day.start))) {
      toast.error('Confira o horário inicial e final dos dias ativos.');
      return;
    }
    setHoursSaving(true);
    const { error } = await upsert({ working_hours: hours as Json });
    setHoursSaving(false);
    if (error) toast.error('Não foi possível salvar os horários.');
    else toast.success('Expediente salvo. A página pública já usa estes horários.');
  }

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('agenda_blocks')
      .select('*')
      .gte('block_date', todayInClinic())
      .order('block_date', { ascending: true })
      .order('start_time', { ascending: true, nullsFirst: true });
    if (error) {
      toast.error('Não foi possível carregar os bloqueios.');
    } else {
      setBlocks(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicLink);
      toast.success('Link copiado.');
    } catch {
      toast.error('Não foi possível copiar. Selecione o link e copie manualmente.');
    }
  }

  async function addBlock() {
    if (!date) return toast.error('Escolha a data.');
    if (date < todayInClinic()) return toast.error('Escolha uma data de hoje em diante.');
    if (!allDay && !(start && end && end > start)) {
      return toast.error('O horário final precisa ser depois do inicial.');
    }
    setSaving(true);
    const { error } = await supabase.from('agenda_blocks').insert({
      block_date: date,
      start_time: allDay ? null : start,
      end_time: allDay ? null : end,
      reason: reason.trim() || null,
    });
    if (error) {
      setSaving(false);
      toast.error('Não foi possível bloquear. Tente novamente.');
      return;
    }

    // Avisa se já existe atendimento marcado dentro do período bloqueado.
    const from = `${date}T${allDay ? '00:00' : start}:00-03:00`;
    const to = `${date}T${allDay ? '23:59' : end}:00-03:00`;
    const { count } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .gte('scheduled_at', from)
      .lt('scheduled_at', to)
      .not('status', 'in', '(cancelled,no_show)');

    setSaving(false);
    setReason('');
    toast.success('Período bloqueado. Ele deixa de aparecer como disponível.');
    if (count && count > 0) {
      toast.warning(`Atenção: já existem ${count} agendamento(s) nesse período. Eles não foram alterados.`);
    }
    await load();
  }

  async function removeBlock(id: string) {
    if (!window.confirm('Liberar este período na agenda?')) return;
    const { error } = await supabase.from('agenda_blocks').delete().eq('id', id);
    if (error) return toast.error('Não foi possível remover o bloqueio.');
    toast.success('Período liberado.');
    await load();
  }

  return (
    <Card className="shadow-card border-0 bg-gradient-card xl:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarOff className="w-5 h-5 text-primary" />
          Folgas e disponibilidade pública
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <p className="font-medium text-foreground">Dias e horários de atendimento</p>
          <p className="text-xs text-muted-foreground">
            Defina o expediente real antes de divulgar o link. Sem essa configuração, a página pública não oferece dias.
          </p>
          <div className="space-y-2">
            {weekdays.map(([key, label]) => (
              <div key={key} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2">
                <Switch
                  id={`hours-${key}`}
                  checked={hours[key].enabled}
                  onCheckedChange={(enabled) => setHours((current) => ({
                    ...current, [key]: { ...current[key], enabled },
                  }))}
                />
                <Label htmlFor={`hours-${key}`} className="w-20">{label}</Label>
                {hours[key].enabled && (
                  <>
                    <Input aria-label={`Início ${label}`} type="time" className="w-28" value={hours[key].start}
                      onChange={(event) => setHours((current) => ({
                        ...current, [key]: { ...current[key], start: event.target.value },
                      }))} />
                    <span className="text-sm">às</span>
                    <Input aria-label={`Fim ${label}`} type="time" className="w-28" value={hours[key].end}
                      onChange={(event) => setHours((current) => ({
                        ...current, [key]: { ...current[key], end: event.target.value },
                      }))} />
                  </>
                )}
              </div>
            ))}
          </div>
          <Button type="button" onClick={() => void saveHours()} disabled={settingsLoading || hoursSaving}>
            {hoursSaving ? 'Salvando…' : 'Salvar expediente'}
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Link dos dias disponíveis (para a Meta IA enviar aos clientes)</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input readOnly value={publicLink} onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" variant="outline" onClick={() => void copyLink()}>
              <Copy className="w-4 h-4 mr-2" />
              Copiar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            A página mostra só os dias com horário livre. Não aparece nome de paciente nem o motivo das folgas.
          </p>
        </div>

        <div className="space-y-3">
          <p className="font-medium text-foreground">Bloquear dia ou período</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label htmlFor="block-date">Data</Label>
              <Input id="block-date" type="date" value={date} min={todayInClinic()} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label htmlFor="block-reason">Motivo (só você vê)</Label>
              <Input
                id="block-reason"
                value={reason}
                maxLength={200}
                placeholder="Ex.: feriado, curso, viagem"
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="block-allday" checked={allDay} onCheckedChange={setAllDay} />
            <Label htmlFor="block-allday">Dia inteiro</Label>
          </div>
          {!allDay && (
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <div className="space-y-1">
                <Label htmlFor="block-start">Das</Label>
                <Input id="block-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="block-end">Até</Label>
                <Input id="block-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
          )}
          <Button type="button" onClick={() => void addBlock()} disabled={saving} className="w-full sm:w-auto">
            {saving ? 'Bloqueando…' : 'Bloquear'}
          </Button>
        </div>

        <div className="space-y-2">
          <p className="font-medium text-foreground">Próximos bloqueios</p>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum bloqueio futuro.</p>
          ) : (
            <ul className="space-y-2">
              {blocks.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {formatDay(b.block_date)} ·{' '}
                      {b.start_time && b.end_time
                        ? `${b.start_time.slice(0, 5)} às ${b.end_time.slice(0, 5)}`
                        : 'dia inteiro'}
                    </p>
                    {b.reason && <p className="text-xs text-muted-foreground truncate">{b.reason}</p>}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remover bloqueio"
                    onClick={() => void removeBlock(b.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
