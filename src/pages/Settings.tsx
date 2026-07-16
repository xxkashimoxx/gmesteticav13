import { useEffect, useState } from 'react';
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
  Save,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { loadClinicWhatsApp, saveClinicWhatsApp } from '@/lib/clinicWhatsApp';

const SETTINGS_KEY = 'gm.settings.v1';
type SettingsShape = {
  clinicName: string;
  doctorName: string;
  phone: string;
  email: string;
  address: string;
  notifications: { reminder: boolean; pending: boolean; newAppt: boolean; monthly: boolean };
  security: { twoFactor: boolean; backup: boolean; sessionTimeout: number };
  timezone: string;
  currency: string;
  dateFormat: string;
  theme: 'light' | 'dark' | 'auto';
  density: 'compact' | 'comfortable' | 'spacious';
};

const DEFAULTS: SettingsShape = {
  clinicName: 'GM Estética Avançada',
  doctorName: 'Dra. Goreti',
  phone: '',
  email: '',
  address: '',
  notifications: { reminder: true, pending: true, newAppt: false, monthly: true },
  security: { twoFactor: false, backup: true, sessionTimeout: 30 },
  timezone: 'America/Sao_Paulo',
  currency: 'BRL',
  dateFormat: 'dd/mm/yyyy',
  theme: 'light',
  density: 'comfortable',
};

function applyTheme(theme: SettingsShape['theme']) {
  const root = document.documentElement;
  const dark =
    theme === 'dark' ||
    (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', dark);
}

export default function Settings() {
  const [s, setS] = useState<SettingsShape>(DEFAULTS);
  const [wa, setWa] = useState(loadClinicWhatsApp());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) setS({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    applyTheme(s.theme);
  }, [s.theme]);

  function update<K extends keyof SettingsShape>(k: K, v: SettingsShape[K]) {
    setS((prev) => ({ ...prev, [k]: v }));
  }

  function handleSave() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    const savedWa = saveClinicWhatsApp(wa);
    setWa(savedWa);
    toast.success('Configurações salvas');
  }

  async function handleChangePassword() {
    const pwd = window.prompt('Nova senha (mínimo 6 caracteres):');
    if (!pwd) return;
    if (pwd.length < 6) return toast.error('Senha muito curta');
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) toast.error(error.message);
    else toast.success('Senha atualizada');
  }

  async function handleExport() {
    toast.loading('Exportando dados...', { id: 'exp' });
    const [leads, appts, procs] = await Promise.all([
      supabase.from('leads').select('*'),
      supabase.from('appointments').select('*'),
      supabase.from('procedures').select('*'),
    ]);
    const payload = {
      exportedAt: new Date().toISOString(),
      leads: leads.data ?? [],
      appointments: appts.data ?? [],
      procedures: procs.data ?? [],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gm-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup gerado', { id: 'exp' });
  }

  function handleClearCache() {
    if (!window.confirm('Limpar cache local? Você continuará logado.')) return;
    Object.keys(localStorage)
      .filter((k) => k.startsWith('gm.'))
      .forEach((k) => localStorage.removeItem(k));
    toast.success('Cache limpo');
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Configurações</h1>
        <Button
          onClick={handleSave}
          className="bg-gradient-primary text-primary-foreground shadow-card w-full sm:w-auto"
        >
          <Save className="w-4 h-4 mr-2" />
          Salvar Alterações
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
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
                value={s.clinicName}
                onChange={(e) => update('clinicName', e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doctor-name">Nome do Profissional</Label>
              <Input
                id="doctor-name"
                value={s.doctorName}
                onChange={(e) => update('doctorName', e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinic-phone">Telefone</Label>
              <Input
                id="clinic-phone"
                value={s.phone}
                onChange={(e) => update('phone', e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinic-email">E-mail</Label>
              <Input
                id="clinic-email"
                type="email"
                value={s.email}
                onChange={(e) => update('email', e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinic-address">Endereço</Label>
              <Input
                id="clinic-address"
                value={s.address}
                onChange={(e) => update('address', e.target.value)}
                className="bg-background"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notificações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {[
              { key: 'reminder', title: 'Lembretes de Agendamento', desc: 'Notificar 24h antes dos procedimentos' },
              { key: 'pending', title: 'Pagamentos Pendentes', desc: 'Alertas para valores em atraso' },
              { key: 'newAppt', title: 'Novos Agendamentos', desc: 'Notificar quando houver novos agendamentos' },
              { key: 'monthly', title: 'Relatórios Mensais', desc: 'Envio automático de relatórios financeiros' },
            ].map((n) => (
              <div key={n.key} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.desc}</p>
                </div>
                <Switch
                  checked={s.notifications[n.key as keyof SettingsShape['notifications']]}
                  onCheckedChange={(v) =>
                    update('notifications', { ...s.notifications, [n.key]: v })
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

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
                value={s.timezone}
                onChange={(e) => update('timezone', e.target.value)}
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
                value={s.currency}
                onChange={(e) => update('currency', e.target.value)}
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
                value={s.dateFormat}
                onChange={(e) => update('dateFormat', e.target.value)}
              >
                <option value="dd/mm/yyyy">DD/MM/AAAA</option>
                <option value="mm/dd/yyyy">MM/DD/AAAA</option>
                <option value="yyyy-mm-dd">AAAA-MM-DD</option>
              </select>
            </div>
          </CardContent>
        </Card>

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
              <Switch
                checked={s.security.twoFactor}
                onCheckedChange={(v) => update('security', { ...s.security, twoFactor: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Backup Automático</p>
                <p className="text-sm text-muted-foreground">Backup diário dos dados da clínica</p>
              </div>
              <Switch
                checked={s.security.backup}
                onCheckedChange={(v) => update('security', { ...s.security, backup: v })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-timeout">Timeout da Sessão (minutos)</Label>
              <Input
                id="session-timeout"
                type="number"
                value={s.security.sessionTimeout}
                onChange={(e) =>
                  update('security', {
                    ...s.security,
                    sessionTimeout: Number(e.target.value) || 30,
                  })
                }
                className="bg-background"
              />
            </div>
            <div className="pt-2">
              <Button
                onClick={handleChangePassword}
                variant="outline"
                className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                Alterar Senha
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0 bg-gradient-card xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Aparência e Personalização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="font-medium text-foreground">Tema</p>
                <div className="space-y-2">
                  {(['light', 'dark', 'auto'] as const).map((t) => (
                    <label key={t} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="theme"
                        value={t}
                        checked={s.theme === t}
                        onChange={() => update('theme', t)}
                        className="text-primary"
                      />
                      <span className="text-sm text-foreground capitalize">
                        {t === 'light' ? 'Claro' : t === 'dark' ? 'Escuro' : 'Automático'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="font-medium text-foreground">Densidade da Interface</p>
                <div className="space-y-2">
                  {(['compact', 'comfortable', 'spacious'] as const).map((d) => (
                    <label key={d} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="density"
                        value={d}
                        checked={s.density === d}
                        onChange={() => update('density', d)}
                        className="text-primary"
                      />
                      <span className="text-sm text-foreground capitalize">
                        {d === 'compact' ? 'Compacta' : d === 'comfortable' ? 'Confortável' : 'Espaçosa'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card border-0 bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Gestão de Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={handleExport} variant="outline" className="border-border">
              <Database className="w-4 h-4 mr-2" />
              Exportar Dados
            </Button>
            <Button onClick={handleExport} variant="outline" className="border-border">
              <Shield className="w-4 h-4 mr-2" />
              Backup Manual
            </Button>
            <Button
              onClick={handleClearCache}
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Database className="w-4 h-4 mr-2" />
              Limpar Cache
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
