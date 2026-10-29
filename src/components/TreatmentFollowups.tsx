import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WhatsAppComposer } from '@/components/WhatsAppComposer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

type FollowUp = {
  id: string;
  lead_id: string;
  follow_up_on: string;
  proposed_care: string;
  lead: { name: string; phone: string | null } | null;
};
const db = supabase as any;

export function TreatmentFollowups() {
  const navigate = useNavigate();
  const [items, setItems] = useState<FollowUp[]>([]);
  const [sending, setSending] = useState<FollowUp | null>(null);

  async function load() {
    const limit = new Date();
    limit.setDate(limit.getDate() + 14);
    const { data, error } = await db.from('treatment_plans')
      .select('id,lead_id,follow_up_on,proposed_care,lead:leads(name,phone)')
      .is('follow_up_completed_at', null).not('follow_up_on', 'is', null)
      .lte('follow_up_on', limit.toISOString().slice(0, 10)).order('follow_up_on');
    if (error) toast.error('Não foi possível carregar os retornos', { description: error.message });
    else setItems((data ?? []) as FollowUp[]);
  }
  useEffect(() => { void load(); }, []);

  async function complete(id: string) {
    const { error } = await db.from('treatment_plans').update({ follow_up_completed_at: new Date().toISOString() }).eq('id', id);
    if (error) toast.error('Falha ao concluir o retorno', { description: error.message });
    else { toast.success('Retorno concluído'); setSending(null); await load(); }
  }

  const today = new Date().toISOString().slice(0, 10);
  return <>
    <Card className="shadow-card border-0 bg-gradient-card">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base">
        <AlertTriangle className="w-5 h-5 text-warning" />Retornos dos planos ({items.length})
      </CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">Nenhum retorno vencido ou previsto para os próximos 14 dias.</p>}
        {items.map(item => {
          const overdue = item.follow_up_on < today;
          return <div key={item.id} className="rounded-lg border bg-background p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <button className="text-left" onClick={() => navigate(`/patients/${item.lead_id}`)}>
                <p className="font-medium text-sm">{item.lead?.name ?? 'Paciente'}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{item.proposed_care}</p>
              </button>
              <Badge variant={overdue ? 'destructive' : 'outline'}>{overdue ? 'Atrasado' : new Date(`${item.follow_up_on}T12:00:00`).toLocaleDateString('pt-BR')}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {item.lead?.phone && <Button size="sm" variant="outline" onClick={() => setSending(item)}><MessageCircle className="w-4 h-4 mr-1" />WhatsApp</Button>}
              <Button size="sm" variant="outline" onClick={() => complete(item.id)}><CheckCircle2 className="w-4 h-4 mr-1" />Concluir</Button>
            </div>
          </div>;
        })}
      </CardContent>
    </Card>
    {sending?.lead && <WhatsAppComposer open={!!sending} onOpenChange={o => !o && setSending(null)}
      phone={sending.lead.phone} patientName={sending.lead.name}
      title={`Acompanhamento — ${sending.lead.name}`}
      defaultMessage={`Oi, ${sending.lead.name.trim().split(/\s+/)[0]}! Aqui é a Dra. Goreti. Estou entrando em contato para acompanhar como você está e saber se ficou alguma dúvida sobre o plano que conversamos. Como você está se sentindo?`}
      onSend={() => complete(sending.id)} />}
  </>;
}
