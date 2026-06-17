import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Users, DollarSign, TrendingUp, Clock } from 'lucide-react';
import { mockPatients, mockAppointments } from '@/data/mockData';

export default function Dashboard() {
  const totalPatients = mockPatients.length;
  const totalRevenue = mockPatients.reduce((sum, patient) => sum + patient.paidValue, 0);
  const pendingRevenue = mockPatients.reduce((sum, patient) => sum + patient.pendingValue, 0);
  const todayAppointments = mockAppointments.filter(
    apt => apt.date === new Date().toISOString().split('T')[0]
  ).length;

  const upcomingAppointments = mockAppointments
    .filter(apt => apt.status === 'scheduled')
    .slice(0, 5);

  const recentPatients = mockPatients
    .filter(patient => patient.procedures.length > 0)
    .slice(0, 4);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
        <div className="text-xs sm:text-sm text-muted-foreground">
          {new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">

        <StatCard
          title="Total de Pacientes"
          value={totalPatients.toString()}
          icon={Users}
          trend={{ value: "12%", isPositive: true }}
        />
        <StatCard
          title="Receita Recebida"
          value={`R$ ${totalRevenue.toLocaleString('pt-BR')}`}
          icon={DollarSign}
          trend={{ value: "8%", isPositive: true }}
        />
        <StatCard
          title="Valores Pendentes"
          value={`R$ ${pendingRevenue.toLocaleString('pt-BR')}`}
          icon={TrendingUp}
          trend={{ value: "3%", isPositive: false }}
        />
        <StatCard
          title="Agendamentos Hoje"
          value={todayAppointments.toString()}
          icon={CalendarDays}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos Agendamentos */}
        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Próximos Agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingAppointments.map((appointment) => (
              <div key={appointment.id} className="flex items-center justify-between p-3 bg-background rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{appointment.patientName}</p>
                  <p className="text-sm text-muted-foreground">{appointment.procedure}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(`${appointment.date}T${appointment.time}`).toLocaleDateString('pt-BR')} às {appointment.time}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="mb-1">
                    {appointment.status === 'scheduled' ? 'Agendado' : appointment.status}
                  </Badge>
                  {appointment.value > 0 && (
                    <p className="text-sm font-medium text-primary">
                      R$ {appointment.value.toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Pacientes Recentes */}
        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Pacientes Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentPatients.map((patient) => (
              <div key={patient.id} className="flex items-center justify-between p-3 bg-background rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-foreground">
                      {patient.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{patient.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {patient.procedures.length} procedimento{patient.procedures.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    R$ {patient.totalValue.toLocaleString('pt-BR')}
                  </p>
                  {patient.pendingValue > 0 ? (
                    <Badge variant="destructive" className="text-xs">
                      Pendente: R$ {patient.pendingValue.toLocaleString('pt-BR')}
                    </Badge>
                  ) : (
                    <Badge className="text-xs bg-success text-success-foreground">
                      Pago
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}