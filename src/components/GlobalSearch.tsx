import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import {
  User,
  Calendar,
  Sparkles,
  Flame,
  ArrowRight,
} from 'lucide-react';

interface LeadHit {
  id: string;
  name: string;
  phone: string | null;
  stage: string;
  temperature: string;
}
interface AppointmentHit {
  id: string;
  patient_name: string;
  scheduled_at: string;
  procedure_name: string | null;
}
interface ProcedureHit {
  id: string;
  name: string;
  category: string | null;
}

export function GlobalSearch() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [leads, setLeads] = useState<LeadHit[]>([]);
  const [appts, setAppts] = useState<AppointmentHit[]>([]);
  const [procs, setProcs] = useState<ProcedureHit[]>([]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    (window as any).__openGlobalSearch = () => setOpen(true);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    const t = setTimeout(async () => {
      if (!term) {
        // sem query: mostra recentes
        const [{ data: l }, { data: a }] = await Promise.all([
          supabase.from('leads').select('id, name, phone, stage, temperature').order('created_at', { ascending: false }).limit(6),
          supabase.from('appointments').select('id, patient_name, scheduled_at, procedure_name').gte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(6),
        ]);
        setLeads((l ?? []) as LeadHit[]);
        setAppts((a ?? []) as AppointmentHit[]);
        setProcs([]);
        return;
      }
      const like = `%${term}%`;
      const [{ data: l }, { data: a }, { data: p }] = await Promise.all([
        supabase
          .from('leads')
          .select('id, name, phone, stage, temperature')
          .or(`name.ilike.${like},phone.ilike.${like},procedure_interest.ilike.${like}`)
          .limit(8),
        supabase
          .from('appointments')
          .select('id, patient_name, scheduled_at, procedure_name')
          .or(`patient_name.ilike.${like},procedure_name.ilike.${like}`)
          .order('scheduled_at', { ascending: false })
          .limit(8),
        supabase
          .from('procedures')
          .select('id, name, category')
          .or(`name.ilike.${like},category.ilike.${like}`)
          .limit(6),
      ]);
      setLeads((l ?? []) as LeadHit[]);
      setAppts((a ?? []) as AppointmentHit[]);
      setProcs((p ?? []) as ProcedureHit[]);
    }, 180);
    return () => clearTimeout(t);
  }, [q, open]);

  function go(path: string) {
    setOpen(false);
    setQ('');
    nav(path);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Buscar pacientes, agendamentos, procedimentos... (Ctrl+K)"
        value={q}
        onValueChange={setQ}
      />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>

        {leads.length > 0 && (
          <CommandGroup heading="Pacientes / Leads">
            {leads.map((l) => (
              <CommandItem key={l.id} value={`lead-${l.id}-${l.name}`} onSelect={() => go(`/patients/${l.id}`)}>
                <User className="w-4 h-4 mr-2 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{l.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {l.stage} · {l.temperature === 'hot' ? '🔥 quente' : l.temperature === 'warm' ? '♨ morno' : '❄ frio'}
                    {l.phone ? ` · ${l.phone}` : ''}
                  </p>
                </div>
                <ArrowRight className="w-3 h-3 opacity-40" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {appts.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Agendamentos">
              {appts.map((a) => (
                <CommandItem key={a.id} value={`apt-${a.id}-${a.patient_name}`} onSelect={() => go('/schedule')}>
                  <Calendar className="w-4 h-4 mr-2 text-accent" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{a.patient_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(a.scheduled_at).toLocaleString('pt-BR')} · {a.procedure_name ?? '—'}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {procs.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Procedimentos">
              {procs.map((p) => (
                <CommandItem key={p.id} value={`proc-${p.id}-${p.name}`} onSelect={() => go('/procedures')}>
                  <Sparkles className="w-4 h-4 mr-2 text-warning" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">{p.category ?? '—'}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Ir para">
          <CommandItem onSelect={() => go('/hoje')}><Flame className="w-4 h-4 mr-2" />Hoje</CommandItem>
          <CommandItem onSelect={() => go('/schedule')}><Calendar className="w-4 h-4 mr-2" />Agenda</CommandItem>
          <CommandItem onSelect={() => go('/patients')}><User className="w-4 h-4 mr-2" />Pacientes</CommandItem>
          <CommandItem onSelect={() => go('/leads')}><Flame className="w-4 h-4 mr-2" />Leads</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
