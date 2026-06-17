import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  User, 
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { mockAppointments } from '@/data/mockData';
import { format, addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return mockAppointments.filter(apt => apt.date === dateStr);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success text-success-foreground';
      case 'cancelled':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-primary text-primary-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return CheckCircle;
      case 'cancelled':
        return XCircle;
      default:
        return AlertCircle;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Agenda</h1>
        <Button className="bg-gradient-primary text-primary-foreground shadow-card w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      {/* Week Navigation */}
      <Card className="shadow-card border-0 bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 text-base md:text-lg">
              <CalendarIcon className="w-5 h-5 text-primary" />
              <span className="truncate">Semana de {format(weekStart, "dd 'de' MMMM", { locale: ptBR })}</span>
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

      {/* Weekly Schedule */}
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
                  <div className={`text-lg font-bold ${
                    isToday ? 'text-primary' : 'text-foreground'
                  }`}>
                    {format(day, 'dd')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {dayAppointments.length} agendamento{dayAppointments.length !== 1 ? 's' : ''}
                  </div>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {dayAppointments.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Sem agendamentos</p>
                  </div>
                ) : (
                  dayAppointments
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((appointment) => {
                      const StatusIcon = getStatusIcon(appointment.status);
                      return (
                        <div
                          key={appointment.id}
                          className="p-3 bg-background rounded-lg border border-border hover:shadow-card transition-smooth"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="text-sm font-medium text-foreground">
                              {appointment.time}
                            </div>
                            <StatusIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center text-sm">
                              <User className="w-3 h-3 mr-1 text-muted-foreground" />
                              <span className="font-medium text-foreground">
                                {appointment.patientName}
                              </span>
                            </div>
                            
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {appointment.procedure}
                            </p>
                            
                            {appointment.value > 0 && (
                              <div className="flex items-center text-xs text-primary">
                                <DollarSign className="w-3 h-3 mr-1" />
                                R$ {appointment.value.toLocaleString('pt-BR')}
                              </div>
                            )}
                            
                            <Badge 
                              className={`text-xs ${getStatusColor(appointment.status)}`}
                            >
                              {appointment.status === 'scheduled' && 'Agendado'}
                              {appointment.status === 'completed' && 'Concluído'}
                              {appointment.status === 'cancelled' && 'Cancelado'}
                            </Badge>
                          </div>
                        </div>
                      );
                    })
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Today's Summary */}
      {getAppointmentsForDate(new Date()).length > 0 && (
        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              Resumo de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-background rounded-lg">
                <div className="text-2xl font-bold text-foreground">
                  {getAppointmentsForDate(new Date()).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total de Agendamentos
                </div>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  R$ {getAppointmentsForDate(new Date())
                    .reduce((sum, apt) => sum + apt.value, 0)
                    .toLocaleString('pt-BR')
                  }
                </div>
                <div className="text-sm text-muted-foreground">
                  Receita Prevista
                </div>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <div className="text-2xl font-bold text-success">
                  {getAppointmentsForDate(new Date())
                    .filter(apt => apt.status === 'completed').length
                  }
                </div>
                <div className="text-sm text-muted-foreground">
                  Procedimentos Concluídos
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}