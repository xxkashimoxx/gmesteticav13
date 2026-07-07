import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  Users,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { normalizePhone } from '@/lib/whatsapp';

type PatientRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  tags: string[] | null;
  stage: string;
  last_contact_at: string | null;
  created_at: string;
  appointments_count: number;
  next_appointment: string | null;
};

type Filter = 'all' | 'patients' | 'leads' | 'vip';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'patients', label: 'Pacientes' },
  { key: 'leads', label: 'Apenas leads' },
  { key: 'vip', label: 'VIP' },
];

export default function Patients() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  async function load() {
    setLoading(true);
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, name, phone, email, tags, stage, last_contact_at, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar pacientes', { description: error.message });
      setLoading(false);
      return;
    }

    const ids = (leads ?? []).map((l) => l.id);
    let apts: { lead_id: string | null; scheduled_at: string }[] = [];
    if (ids.length) {
      const { data } = await supabase
        .from('appointments')
        .select('lead_id, scheduled_at')
        .in('lead_id', ids);
      apts = data ?? [];
    }
    const map = new Map<string, { count: number; next: string | null }>();
    const nowIso = new Date().toISOString();
    for (const a of apts) {
      if (!a.lead_id) continue;
      const prev = map.get(a.lead_id) ?? { count: 0, next: null };
      prev.count += 1;
      if (a.scheduled_at >= nowIso && (!prev.next || a.scheduled_at < prev.next)) {
        prev.next = a.scheduled_at;
      }
      map.set(a.lead_id, prev);
    }

    const merged: PatientRow[] = (leads ?? []).map((l) => ({
      ...l,
      tags: (l.tags as unknown as string[]) ?? [],
      appointments_count: map.get(l.id)?.count ?? 0,
      next_appointment: map.get(l.id)?.next ?? null,
    }));

    setRows(merged);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return rows.filter((p) => {
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        (p.email ?? '').toLowerCase().includes(term) ||
        (p.phone ?? '').includes(searchTerm);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'patients' && p.appointments_count > 0) ||
        (filter === 'leads' && p.appointments_count === 0) ||
        (filter === 'vip' && p.tags?.includes('vip'));
      return matchesSearch && matchesFilter;
    });
  }, [rows, searchTerm, filter]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      patients: rows.filter((p) => p.appointments_count > 0).length,
      leads: rows.filter((p) => p.appointments_count === 0).length,
      vip: rows.filter((p) => p.tags?.includes('vip')).length,
    }),
    [rows],
  );

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Pacientes</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} de {rows.length} contatos
          </p>
        </div>
        <Button
          onClick={() => navigate('/leads')}
          className="bg-gradient-primary text-primary-foreground shadow-card w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Cadastrar via Leads
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Button
              key={f.key}
              size="sm"
              variant={active ? 'default' : 'outline'}
              onClick={() => setFilter(f.key)}
              className={cn('shrink-0 rounded-full', active && 'bg-primary text-primary-foreground shadow-card')}
            >
              {f.label}
              <span className={cn('ml-2 text-xs px-1.5 py-0.5 rounded-full', active ? 'bg-primary-foreground/20' : 'bg-muted')}>
                {counts[f.key]}
              </span>
            </Button>
          );
        })}
      </div>

      {loading && <p className="text-sm text-muted-foreground text-center py-8">Carregando…</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {filtered.map((p) => {
          const initials = p.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
          const waPhone = normalizePhone(p.phone);
          return (
            <Card
              key={p.id}
              className="shadow-card border-0 bg-gradient-card hover:shadow-elevated transition-smooth cursor-pointer"
              onClick={() => navigate(`/patients/${p.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary-foreground">{initials || '?'}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg truncate">{p.name}</CardTitle>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.appointments_count > 0 ? (
                        <Badge className="bg-success text-success-foreground">Paciente</Badge>
                      ) : (
                        <Badge variant="secondary">Lead</Badge>
                      )}
                      {p.tags?.map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {p.phone && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2 shrink-0" />
                      {p.phone}
                    </div>
                  )}
                  {p.email && (
                    <div className="flex items-center truncate">
                      <Mail className="w-4 h-4 mr-2 shrink-0" />
                      <span className="truncate">{p.email}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
                  <span>{p.appointments_count} atendimento(s)</span>
                  {p.next_appointment && (
                    <span className="text-primary bg-primary/10 px-2 py-1 rounded-full">
                      Próx: {new Date(p.next_appointment).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>

                <div className="flex gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                  {waPhone && (
                    <Button size="sm" variant="outline" asChild className="flex-1">
                      <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener">
                        <MessageCircle className="w-3.5 h-3.5 mr-1 text-[#25D366]" /> WhatsApp
                      </a>
                    </Button>
                  )}
                  <Button size="sm" variant="outline" asChild className="flex-1">
                    <Link to={`/patients/${p.id}`}>Ver ficha</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!loading && filtered.length === 0 && (
        <Card className="shadow-card border-0 bg-gradient-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground">Nenhum paciente encontrado</p>
            <p className="text-muted-foreground">Ajuste a busca ou o filtro</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
