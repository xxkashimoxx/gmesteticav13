import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface FunnelLead {
  id: string;
  source: string;
  created_at: string;
  contacted_at: string | null;
  evaluation_scheduled_at: string | null;
  attended_at: string | null;
  converted_at: string | null;
  lost_at: string | null;
}

const dateInput = (d: Date) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

function counts(rows: FunnelLead[]) {
  return {
    received: rows.length,
    replied: rows.filter((l) => !!l.contacted_at).length,
    scheduled: rows.filter((l) => !!l.evaluation_scheduled_at).length,
    attended: rows.filter((l) => !!l.attended_at).length,
    closed: rows.filter((l) => !!l.converted_at).length,
    lost: rows.filter((l) => !!l.lost_at).length,
  };
}

export function LeadFunnelReport({ leads, loading }: { leads: FunnelLead[]; loading: boolean }) {
  const [start, setStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return dateInput(d);
  });
  const [end, setEnd] = useState(() => dateInput(new Date()));
  const [source, setSource] = useState('Todas');

  const sources = useMemo(() => [...new Set(leads.map((l) => l.source || 'Não informada'))].sort(), [leads]);
  const cohort = useMemo(() => leads.filter((l) => {
    const day = dateInput(new Date(l.created_at));
    return day >= start && day <= end && (source === 'Todas' || (l.source || 'Não informada') === source);
  }), [leads, start, end, source]);
  const total = counts(cohort);
  const bySource = useMemo(() => {
    const grouped = new Map<string, FunnelLead[]>();
    cohort.forEach((l) => {
      const key = l.source || 'Não informada';
      grouped.set(key, [...(grouped.get(key) ?? []), l]);
    });
    return [...grouped].map(([name, rows]) => ({ name, ...counts(rows) }))
      .sort((a, b) => b.received - a.received);
  }, [cohort]);
  const rate = (part: number, whole: number) => whole ? `${Math.round(part / whole * 100)}%` : '—';

  return (
    <Card className="shadow-card">
      <CardHeader className="space-y-3">
        <CardTitle className="text-lg">Funil por origem e período</CardTitle>
        <p className="text-sm text-muted-foreground">Contatos captados nas datas selecionadas. Cada marco conta apenas quando foi registrado, mesmo que a paciente avance depois do período.</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div><Label htmlFor="funnel-start">De</Label><Input id="funnel-start" type="date" value={start} max={end} onChange={(e) => setStart(e.target.value)} /></div>
          <div><Label htmlFor="funnel-end">Até</Label><Input id="funnel-end" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} /></div>
          <div><Label htmlFor="funnel-source">Origem</Label>
            <select id="funnel-source" className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={source} onChange={(e) => setSource(e.target.value)}>
              <option>Todas</option>{sources.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Origem</TableHead><TableHead>Recebidos</TableHead><TableHead>Respondidos</TableHead>
              <TableHead>Agendaram</TableHead><TableHead>Compareceram</TableHead><TableHead>Fecharam</TableHead><TableHead>Perdidos</TableHead><TableHead>Fechamento</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              <TableRow className="font-semibold"><TableCell>Total</TableCell>
                <TableCell>{total.received}</TableCell><TableCell>{total.replied}</TableCell><TableCell>{total.scheduled}</TableCell>
                <TableCell>{total.attended}</TableCell><TableCell>{total.closed}</TableCell><TableCell>{total.lost}</TableCell>
                <TableCell>{rate(total.closed, total.received)}</TableCell>
              </TableRow>
              {bySource.map((r) => <TableRow key={r.name}><TableCell>{r.name}</TableCell>
                <TableCell>{r.received}</TableCell><TableCell>{r.replied}</TableCell><TableCell>{r.scheduled}</TableCell>
                <TableCell>{r.attended}</TableCell><TableCell>{r.closed}</TableCell><TableCell>{r.lost}</TableCell>
                <TableCell>{rate(r.closed, r.received)}</TableCell>
              </TableRow>)}
            </TableBody>
          </Table>
        </div>
        {!loading && !cohort.length && <p className="text-sm text-muted-foreground">Nenhum contato cadastrado neste período e origem.</p>}
        <p className="text-xs text-muted-foreground">Etapas anteriores à implantação não recebem datas inventadas. Complete a etapa no cadastro quando houver registro confiável. “Respondido” significa que a etapa Em contato foi registrada; a abertura do WhatsApp não confirma resposta.</p>
      </CardContent>
    </Card>
  );
}
