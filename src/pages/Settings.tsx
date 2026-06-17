import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Palette,
  Database,
  Save
} from 'lucide-react';

export default function Settings() {
  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Configurações</h1>
        <Button className="bg-gradient-primary text-primary-foreground shadow-card w-full sm:w-auto">
          <Save className="w-4 h-4 mr-2" />
          Salvar Alterações
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">

        {/* Profile Settings */}
        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Perfil da Clínica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clinic-name">Nome da Clínica</Label>
              <Input 
                id="clinic-name" 
                defaultValue="Clínica de Estética Avançada"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doctor-name">Nome do Profissional</Label>
              <Input 
                id="doctor-name" 
                defaultValue="Dr. Admin"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinic-phone">Telefone</Label>
              <Input 
                id="clinic-phone" 
                defaultValue="(11) 99999-9999"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinic-email">E-mail</Label>
              <Input 
                id="clinic-email" 
                defaultValue="contato@clinica.com"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinic-address">Endereço</Label>
              <Input 
                id="clinic-address" 
                defaultValue="Rua da Beleza, 123 - São Paulo, SP"
                className="bg-background"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notificações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Lembretes de Agendamento</p>
                <p className="text-sm text-muted-foreground">Notificar 24h antes dos procedimentos</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Pagamentos Pendentes</p>
                <p className="text-sm text-muted-foreground">Alertas para valores em atraso</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Novos Agendamentos</p>
                <p className="text-sm text-muted-foreground">Notificar quando houver novos agendamentos</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Relatórios Mensais</p>
                <p className="text-sm text-muted-foreground">Envio automático de relatórios financeiros</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-primary" />
              Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Fuso Horário</Label>
              <select 
                id="timezone" 
                className="w-full p-2 border border-input rounded-md bg-background"
                defaultValue="America/Sao_Paulo"
              >
                <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                <option value="America/New_York">Nova York (GMT-5)</option>
                <option value="Europe/London">Londres (GMT+0)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Moeda</Label>
              <select 
                id="currency" 
                className="w-full p-2 border border-input rounded-md bg-background"
                defaultValue="BRL"
              >
                <option value="BRL">Real Brasileiro (R$)</option>
                <option value="USD">Dólar Americano ($)</option>
                <option value="EUR">Euro (€)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-format">Formato de Data</Label>
              <select 
                id="date-format" 
                className="w-full p-2 border border-input rounded-md bg-background"
                defaultValue="dd/mm/yyyy"
              >
                <option value="dd/mm/yyyy">DD/MM/AAAA</option>
                <option value="mm/dd/yyyy">MM/DD/AAAA</option>
                <option value="yyyy-mm-dd">AAAA-MM-DD</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Segurança
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Autenticação em Duas Etapas</p>
                <p className="text-sm text-muted-foreground">Adiciona uma camada extra de segurança</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Backup Automático</p>
                <p className="text-sm text-muted-foreground">Backup diário dos dados da clínica</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-timeout">Timeout da Sessão (minutos)</Label>
              <Input 
                id="session-timeout" 
                type="number"
                defaultValue="30"
                className="bg-background"
              />
            </div>
            <div className="pt-2">
              <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
                Alterar Senha
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="shadow-card border-0 bg-gradient-card xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Aparência e Personalização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <p className="font-medium text-foreground">Tema</p>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="radio" name="theme" value="light" defaultChecked className="text-primary" />
                    <span className="text-sm text-foreground">Claro</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="radio" name="theme" value="dark" className="text-primary" />
                    <span className="text-sm text-foreground">Escuro</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="radio" name="theme" value="auto" className="text-primary" />
                    <span className="text-sm text-foreground">Automático</span>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <p className="font-medium text-foreground">Cor Principal</p>
                <div className="grid grid-cols-4 gap-2">
                  {['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-red-500'].map((color, index) => (
                    <button
                      key={index}
                      className={`w-8 h-8 rounded-full ${color} ${index === 0 ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="font-medium text-foreground">Densidade da Interface</p>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="radio" name="density" value="compact" className="text-primary" />
                    <span className="text-sm text-foreground">Compacta</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="radio" name="density" value="comfortable" defaultChecked className="text-primary" />
                    <span className="text-sm text-foreground">Confortável</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="radio" name="density" value="spacious" className="text-primary" />
                    <span className="text-sm text-foreground">Espaçosa</span>
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Management */}
      <Card className="shadow-card border-0 bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Gestão de Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="border-border">
              <Database className="w-4 h-4 mr-2" />
              Exportar Dados
            </Button>
            <Button variant="outline" className="border-border">
              <Shield className="w-4 h-4 mr-2" />
              Backup Manual
            </Button>
            <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
              <Database className="w-4 h-4 mr-2" />
              Limpar Cache
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}