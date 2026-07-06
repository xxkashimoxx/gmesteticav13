import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DollarSign,
  TrendingUp,
  Search,
  Filter,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { mockPatients } from '@/data/mockData';
import { StatCard } from '@/components/StatCard';

type PayFilter = 'all' | 'paid' | 'unpaid';

export default function Finance() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [payFilter, setPayFilter] = useState<PayFilter>('all');
  const [paidOverrides, setPaidOverrides] = useState<Record<string, boolean>>({});
  
  // Calculate financial metrics
  const totalRevenue = mockPatients.reduce((sum, patient) => sum + patient.paidValue, 0);
  const pendingRevenue = mockPatients.reduce((sum, patient) => sum + patient.pendingValue, 0);
  const totalExpected = mockPatients.reduce((sum, patient) => sum + patient.totalValue, 0);
  
  // Get all procedures for financial tracking
  const allProcedures = mockPatients.flatMap(patient => 
    patient.procedures.map(procedure => ({
      ...procedure,
      patientName: patient.name,
      patientId: patient.id
    }))
  );
  
  const withOverrides = allProcedures.map((p) => ({
    ...p,
    paid: paidOverrides[p.id] ?? p.paid,
  }));

  const filteredProcedures = withOverrides.filter(
    (procedure) =>
      procedure.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      procedure.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const paidProcedures =
    payFilter === 'unpaid' ? [] : filteredProcedures.filter((p) => p.paid);
  const unpaidProcedures =
    payFilter === 'paid' ? [] : filteredProcedures.filter((p) => !p.paid);

  function cycleFilter() {
    const next: PayFilter = payFilter === 'all' ? 'paid' : payFilter === 'paid' ? 'unpaid' : 'all';
    setPayFilter(next);
    toast.info(
      next === 'all' ? 'Mostrando todos' : next === 'paid' ? 'Somente pagos' : 'Somente pendentes',
    );
  }

  function markPaid(id: string) {
    setPaidOverrides((prev) => ({ ...prev, [id]: true }));
    toast.success('Marcado como pago');
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Financeiro</h1>
        <Button
          onClick={() => navigate('/schedule')}
          className="bg-gradient-primary text-primary-foreground shadow-card w-full sm:w-auto"
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Registrar Pagamento
        </Button>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard
          title="Receita Recebida"
          value={`R$ ${totalRevenue.toLocaleString('pt-BR')}`}
          icon={TrendingUp}
          trend={{ value: "15%", isPositive: true }}
          className="border-l-4 border-l-success"
        />
        <StatCard
          title="Valores Pendentes"
          value={`R$ ${pendingRevenue.toLocaleString('pt-BR')}`}
          icon={Clock}
          trend={{ value: "5%", isPositive: false }}
          className="border-l-4 border-l-warning"
        />
        <StatCard
          title="Receita Total Esperada"
          value={`R$ ${totalExpected.toLocaleString('pt-BR')}`}
          icon={DollarSign}
          className="border-l-4 border-l-primary"
        />
        <StatCard
          title="Taxa de Recebimento"
          value={`${((totalRevenue / totalExpected) * 100).toFixed(1)}%`}
          icon={TrendingUp}
          className="border-l-4 border-l-accent"
        />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar procedimentos ou pacientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="border-border w-full sm:w-auto">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">

        {/* Payments Received */}
        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <CheckCircle className="w-5 h-5" />
              Pagamentos Recebidos ({paidProcedures.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {paidProcedures.map((procedure) => (
              <div key={procedure.id} className="p-3 bg-background rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">{procedure.patientName}</span>
                  </div>
                  <Badge className="bg-success text-success-foreground">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Pago
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{procedure.name}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(procedure.date).toLocaleDateString('pt-BR')}
                    </div>
                    <span className="text-success font-bold">
                      R$ {procedure.value.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  {procedure.description && (
                    <p className="text-xs text-muted-foreground">{procedure.description}</p>
                  )}
                </div>
              </div>
            ))}
            {paidProcedures.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum pagamento encontrado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <XCircle className="w-5 h-5" />
              Pagamentos Pendentes ({unpaidProcedures.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {unpaidProcedures.map((procedure) => (
              <div key={procedure.id} className="p-3 bg-background rounded-lg border border-destructive/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">{procedure.patientName}</span>
                  </div>
                  <Badge variant="destructive">
                    <XCircle className="w-3 h-3 mr-1" />
                    Pendente
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{procedure.name}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(procedure.date).toLocaleDateString('pt-BR')}
                    </div>
                    <span className="text-destructive font-bold">
                      R$ {procedure.value.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  {procedure.description && (
                    <p className="text-xs text-muted-foreground">{procedure.description}</p>
                  )}
                </div>
                <div className="mt-2 pt-2 border-t border-border">
                  <Button size="sm" variant="outline" className="w-full text-xs">
                    Marcar como Pago
                  </Button>
                </div>
              </div>
            ))}
            {unpaidProcedures.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum pagamento pendente</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Chart Placeholder */}
      <Card className="shadow-card border-0 bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Receita Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Gráfico de Receita</p>
              <p className="text-sm">Em desenvolvimento</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}