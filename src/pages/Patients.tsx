import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
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
  Eye,
  Edit,
  MoreVertical,
  Users,
  CheckCircle2,
  AlertCircle,
  CalendarClock,
} from 'lucide-react';
import { mockPatients } from '@/data/mockData';
import { Patient } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type StatusKey = 'all' | 'em-dia' | 'pendencias' | 'agendado';

const STATUS_FILTERS: { key: StatusKey; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'em-dia', label: 'Em dia' },
  { key: 'pendencias', label: 'Pendências' },
  { key: 'agendado', label: 'Com agendamento' },
];

function getPatientStatus(p: Patient): Exclude<StatusKey, 'all'> {
  if (p.pendingValue > 0) return 'pendencias';
  if (p.nextAppointment) return 'agendado';
  return 'em-dia';
}

function StatusBadge({ patient }: { patient: Patient }) {
  const status = getPatientStatus(patient);
  if (status === 'pendencias') {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="w-3 h-3" /> Pendências
      </Badge>
    );
  }
  if (status === 'agendado') {
    return (
      <Badge className="bg-primary text-primary-foreground gap-1">
        <CalendarClock className="w-3 h-3" /> Agendado
      </Badge>
    );
  }
  return (
    <Badge className="bg-success text-success-foreground gap-1">
      <CheckCircle2 className="w-3 h-3" /> Em dia
    </Badge>
  );
}

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Patients() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<StatusKey>('all');
  const [selected, setSelected] = useState<Patient | null>(null);

  const filteredPatients = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return mockPatients.filter((p) => {
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.email.toLowerCase().includes(term) ||
        p.phone.includes(searchTerm);
      const matchesStatus = status === 'all' || getPatientStatus(p) === status;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, status]);

  const counts = useMemo(
    () => ({
      all: mockPatients.length,
      'em-dia': mockPatients.filter((p) => getPatientStatus(p) === 'em-dia').length,
      pendencias: mockPatients.filter((p) => getPatientStatus(p) === 'pendencias').length,
      agendado: mockPatients.filter((p) => getPatientStatus(p) === 'agendado').length,
    }),
    []
  );

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Pacientes</h1>
          <p className="text-sm text-muted-foreground">
            {filteredPatients.length} de {mockPatients.length} pacientes
          </p>
        </div>
        <Button
          onClick={() => toast.info('Cadastro de paciente ocorre ao criar agendamento em /agenda')}
          className="bg-gradient-primary text-primary-foreground shadow-card w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Paciente
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {STATUS_FILTERS.map((f) => {
          const active = status === f.key;
          return (
            <Button
              key={f.key}
              size="sm"
              variant={active ? 'default' : 'outline'}
              onClick={() => setStatus(f.key)}
              className={cn(
                'shrink-0 rounded-full',
                active && 'bg-primary text-primary-foreground shadow-card'
              )}
            >
              {f.label}
              <span
                className={cn(
                  'ml-2 text-xs px-1.5 py-0.5 rounded-full',
                  active ? 'bg-primary-foreground/20' : 'bg-muted'
                )}
              >
                {counts[f.key]}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Patients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {filteredPatients.map((patient) => (
          <Card
            key={patient.id}
            className="shadow-card border-0 bg-gradient-card hover:shadow-elevated transition-smooth cursor-pointer"
            onClick={() => setSelected(patient)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary-foreground">
                      {patient.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-lg truncate">{patient.name}</CardTitle>
                    <div className="mt-1">
                      <StatusBadge patient={patient} />
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="bg-popover border border-border shadow-elevated"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenuItem onClick={() => setSelected(patient)}>
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalhes
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Calendar className="w-4 h-4 mr-2" />
                      Agendar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center"><Phone className="w-4 h-4 mr-2" />{patient.phone}</div>
                <div className="flex items-center truncate"><Mail className="w-4 h-4 mr-2 shrink-0" /><span className="truncate">{patient.email}</span></div>
              </div>

              <div className="pt-3 border-t border-border grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[11px] text-muted-foreground">Total</p>
                  <p className="text-sm font-semibold text-foreground">{brl(patient.totalValue)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Pago</p>
                  <p className="text-sm font-semibold text-success">{brl(patient.paidValue)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Pendente</p>
                  <p className={cn('text-sm font-semibold', patient.pendingValue > 0 ? 'text-destructive' : 'text-foreground')}>
                    {brl(patient.pendingValue)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">
                  {patient.procedures.length} procedimento{patient.procedures.length !== 1 ? 's' : ''}
                </span>
                {patient.nextAppointment && (
                  <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
                    Próx: {new Date(patient.nextAppointment).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPatients.length === 0 && (
        <Card className="shadow-card border-0 bg-gradient-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground">Nenhum paciente encontrado</p>
            <p className="text-muted-foreground">Ajuste a busca ou o filtro de status</p>
          </CardContent>
        </Card>
      )}

      {/* Patient details dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
          {selected && (
            <>
              <DialogHeader className="p-6 pb-4 bg-gradient-primary text-primary-foreground">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-primary-foreground/15 ring-2 ring-secondary/60 flex items-center justify-center shrink-0">
                    <span className="text-base font-bold">
                      {selected.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div className="min-w-0 text-left">
                    <DialogTitle className="text-xl truncate">{selected.name}</DialogTitle>
                    <DialogDescription className="text-primary-foreground/80 truncate">
                      Nascimento: {new Date(selected.birthDate).toLocaleDateString('pt-BR')}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="max-h-[calc(90vh-9rem)]">
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center text-muted-foreground"><Phone className="w-4 h-4 mr-2" />{selected.phone}</div>
                    <div className="flex items-center text-muted-foreground truncate"><Mail className="w-4 h-4 mr-2 shrink-0" /><span className="truncate">{selected.email}</span></div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <Card className="border-0 bg-muted/40 shadow-none">
                      <CardContent className="p-3 text-center">
                        <p className="text-[11px] text-muted-foreground">Total</p>
                        <p className="font-bold">{brl(selected.totalValue)}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-0 bg-success/10 shadow-none">
                      <CardContent className="p-3 text-center">
                        <p className="text-[11px] text-muted-foreground">Pago</p>
                        <p className="font-bold text-success">{brl(selected.paidValue)}</p>
                      </CardContent>
                    </Card>
                    <Card className={cn('border-0 shadow-none', selected.pendingValue > 0 ? 'bg-destructive/10' : 'bg-muted/40')}>
                      <CardContent className="p-3 text-center">
                        <p className="text-[11px] text-muted-foreground">Pendente</p>
                        <p className={cn('font-bold', selected.pendingValue > 0 ? 'text-destructive' : 'text-foreground')}>
                          {brl(selected.pendingValue)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-foreground">Procedimentos realizados</h3>
                      <Badge variant="secondary">{selected.procedures.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {selected.procedures.length === 0 && (
                        <p className="text-sm text-muted-foreground">Nenhum procedimento registrado.</p>
                      )}
                      {selected.procedures.map((proc) => (
                        <Card key={proc.id} className="border border-border shadow-none">
                          <CardContent className="p-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-foreground truncate">{proc.name}</p>
                              {proc.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">{proc.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(proc.date).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-semibold text-sm text-foreground">{brl(proc.value)}</p>
                              {proc.paid ? (
                                <Badge className="bg-success text-success-foreground mt-1">Pago</Badge>
                              ) : (
                                <Badge variant="destructive" className="mt-1">Pendente</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {selected.nextAppointment && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-sm">
                      <CalendarClock className="w-4 h-4 text-primary" />
                      <span className="text-foreground">
                        Próximo agendamento:{' '}
                        <strong>
                          {new Date(selected.nextAppointment).toLocaleString('pt-BR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
