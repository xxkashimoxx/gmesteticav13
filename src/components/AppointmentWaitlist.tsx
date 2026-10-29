import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { WhatsAppComposer } from '@/components/WhatsAppComposer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type Waiting = {
  id: string; name: string; phone: string; procedure_interest: string | null;
  preferred_period: string | null; notes: string | null; status: 'waiting' | 'offered' | 'closed';
  created_at: string;
};

const table = (supabase as any).from('appointment_waitlist');
const empty = { name: '', phone: '', procedure_interest: '', preferred_period: '', notes: '' };

export function AppointmentWaitlist() {
  const [items, setItems] = useState<Waiting[]>([]);
  const [form, setForm] = useState(empty);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offering, setOffering] = useState<Waiting | null>(null);
  const [offerTime, setOfferTime] = useState('');
  const [offerOpen, setOfferOpen] = useState(false);

  async function load() {
    const { data, error } = await table.select('*').neq('status', 'closed').order('created_at', { ascending: true });
    if (error) toast({ title: 'Erro na lista de espera', description: error.message, variant: 'destructive' });
    else setItems((data ?? []) as Waiting[]);
  }
  useEffect(() => { void load(); }, []);

  async function add() {
    if (!form.name.trim() || form.phone.replace(/\D/g, '').length < 10) {
      toast({ title: 'Informe nome e WhatsApp válido', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await table.insert({
      name: form.name.trim(), phone: form.phone.trim(),
      procedure_interest: form.procedure_interest.trim() || null,
      preferred_period: form.preferred_period.trim() || null, notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (error) toast({ title: 'Não foi possível adicionar', description: error.message, variant: 'destructive' });
    else { setAdding(false); setForm(empty); await load(); }
  }

  async function update(id: string, status: 'offered' | 'closed') {
    const { error } = await table.update(status === 'offered'
      ? { status, offered_at: new Date().toISOString() }
      : { status, resolved_at: new Date().toISOString() }).eq('id', id);
    if (error) toast({ title: 'Não foi possível atualizar', description: error.message, variant: 'destructive' });
    else await load();
  }

  const offerMessage = offering && offerTime
    ? `Oi, ${offering.name.trim().split(/\s+/)[0]}! Surgiu um horário na GM Estética Avançada para ${new Date(offerTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}. Você tem interesse? Me confirme por aqui para eu reservar.`
    : '';

  return <Card className="shadow-card">
    <CardHeader className="flex flex-row items-center justify-between gap-2">
      <CardTitle className="text-base md:text-lg">Lista de espera ({items.length})</CardTitle>
      <Button size="sm" variant="outline" onClick={() => setAdding(!adding)}>{adding ? 'Fechar' : 'Adicionar'}</Button>
    </CardHeader>
    <CardContent className="space-y-3">
      {adding && <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
        <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>WhatsApp *</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
        <div><Label>Procedimento de interesse</Label><Input value={form.procedure_interest} onChange={e => setForm({ ...form, procedure_interest: e.target.value })} /></div>
        <div><Label>Preferência de dia ou turno</Label><Input value={form.preferred_period} onChange={e => setForm({ ...form, preferred_period: e.target.value })} placeholder="Ex.: terça à tarde" /></div>
        <div className="sm:col-span-2"><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
        <Button disabled={saving} onClick={add} className="sm:col-span-2">{saving ? 'Salvando...' : 'Adicionar à lista'}</Button>
      </div>}
      {items.length === 0 && <p className="text-sm text-muted-foreground">Ninguém na lista de espera.</p>}
      {items.map(item => <div key={item.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm"><p className="font-medium">{item.name} {item.status === 'offered' && <span className="text-muted-foreground">· oferta feita</span>}</p>
          <p className="text-xs text-muted-foreground">{item.procedure_interest || 'Procedimento não informado'} · {item.preferred_period || 'Sem preferência'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => { setOffering(item); setOfferTime(''); setOfferOpen(false); }}>Oferecer horário</Button>
          <Button size="sm" variant="outline" onClick={() => update(item.id, 'closed')}>Encerrar</Button>
        </div>
      </div>)}
      {offering && <div className="rounded-lg border p-3 space-y-2">
        <Label htmlFor="waitlist-offer-time">Horário liberado para {offering.name}</Label>
        <Input id="waitlist-offer-time" type="datetime-local" value={offerTime} onChange={e => setOfferTime(e.target.value)} />
        <p className="text-xs text-muted-foreground">Confira a disponibilidade na agenda antes de oferecer. O horário só fica reservado depois que você confirmar com a paciente.</p>
        <Button variant="outline" size="sm" onClick={() => setOffering(null)}>Cancelar</Button>
        <Button size="sm" disabled={!offerTime || new Date(offerTime).getTime() <= Date.now()} onClick={() => setOfferOpen(true)}>Preparar mensagem</Button>
        {offerTime && <WhatsAppComposer open={offerOpen} onOpenChange={setOfferOpen}
          phone={offering.phone} patientName={offering.name} defaultMessage={offerMessage}
          title={`Oferecer horário — ${offering.name}`}
          onSend={() => { void update(offering.id, 'offered'); setOffering(null); }} />}
      </div>}
    </CardContent>
  </Card>;
}
