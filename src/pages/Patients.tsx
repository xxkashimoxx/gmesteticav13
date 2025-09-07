import { useState } from 'react';
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
  DollarSign,
  Eye,
  Edit,
  MoreVertical,
  Users
} from 'lucide-react';
import { mockPatients } from '@/data/mockData';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Patients() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredPatients = mockPatients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone.includes(searchTerm)
  );

  const getStatusBadge = (patient: any) => {
    if (patient.pendingValue > 0) {
      return <Badge variant="destructive">Pendências</Badge>;
    }
    return <Badge className="bg-success text-success-foreground">Em dia</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Pacientes</h1>
        <Button className="bg-gradient-primary text-primary-foreground shadow-card">
          <Plus className="w-4 h-4 mr-2" />
          Novo Paciente
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pacientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Patients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPatients.map((patient) => (
          <Card key={patient.id} className="shadow-card border-0 bg-gradient-card hover:shadow-elevated transition-smooth">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-foreground">
                      {patient.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-lg">{patient.name}</CardTitle>
                    {getStatusBadge(patient)}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover border border-border shadow-elevated">
                    <DropdownMenuItem>
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
              {/* Contact Info */}
              <div className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Phone className="w-4 h-4 mr-2" />
                  {patient.phone}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Mail className="w-4 h-4 mr-2" />
                  {patient.email}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4 mr-2" />
                  {new Date(patient.birthDate).toLocaleDateString('pt-BR')}
                </div>
              </div>

              {/* Financial Summary */}
              <div className="pt-3 border-t border-border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Gasto:</span>
                  <span className="font-medium text-foreground">
                    R$ {patient.totalValue.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pago:</span>
                  <span className="font-medium text-success">
                    R$ {patient.paidValue.toLocaleString('pt-BR')}
                  </span>
                </div>
                {patient.pendingValue > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Pendente:</span>
                    <span className="font-medium text-destructive">
                      R$ {patient.pendingValue.toLocaleString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>

              {/* Procedures Count */}
              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {patient.procedures.length} procedimento{patient.procedures.length > 1 ? 's' : ''}
                  </span>
                  {patient.nextAppointment && (
                    <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
                      Próx: {new Date(patient.nextAppointment).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
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
            <p className="text-muted-foreground">Tente ajustar os termos de busca</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}