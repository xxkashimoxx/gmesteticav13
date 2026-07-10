import { useEffect } from 'react';
import { Sidebar, MobileHeader, MobileBottomNav } from '@/components/Sidebar';
import { GlobalSearch } from '@/components/GlobalSearch';
import { PageMeta } from '@/components/PageMeta';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClinicSettings } from '@/hooks/useClinicSettings';

const ROUTE_META: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Painel — GM Estética Avançada',
    description: 'Visão geral da clínica: agendamentos do dia, faturamento, leads quentes e desempenho da equipe em tempo real.',
  },
  '/hoje': {
    title: 'Hoje — Agenda do dia | GM Estética',
    description: 'Timeline com atendimentos, confirmações e lembretes automáticos por WhatsApp para o dia atual.',
  },
  '/patients': {
    title: 'Pacientes — Prontuários | GM Estética',
    description: 'Base de pacientes com histórico clínico, anamnese, fotos, procedimentos realizados e evolução do tratamento.',
  },
  '/schedule': {
    title: 'Agenda — Marcações | GM Estética',
    description: 'Calendário completo com marcações, remarcações e bloqueios de horário da clínica.',
  },
  '/leads': {
    title: 'Leads — Captação e vendas | GM Estética',
    description: 'Funil de leads classificados por temperatura, com histórico multicanal e sugestões de resposta com IA.',
  },
  '/finance': {
    title: 'Financeiro — Faturamento | GM Estética',
    description: 'Controle de receita, comissões e vendas de procedimentos com relatórios por período e forma de pagamento.',
  },
  '/settings': {
    title: 'Configurações da clínica | GM Estética',
    description: 'Ajustes da clínica, equipe, horários de atendimento e preferências de notificação.',
  },
  '/integrations': {
    title: 'Integrações — Marketing e tráfego | GM Estética',
    description: 'Conecte WhatsApp, Meta Ads, Google Ads e ferramentas de tráfego pago em um painel dedicado.',
  },
  '/procedures': {
    title: 'Procedimentos — Catálogo | GM Estética',
    description: 'Catálogo de procedimentos com duração, categoria, preço padrão e descrição para uso na agenda e vendas.',
  },
};

const Index = () => {
  const { role } = useAuth();
  const { settings, loading } = useClinicSettings();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const metaKey = pathname.startsWith('/patients/') ? '/patients' : pathname;
  const meta = ROUTE_META[metaKey] ?? ROUTE_META['/'];


  useEffect(() => {
    if (loading) return;
    if (role !== 'admin') return;
    if (pathname.startsWith('/onboarding')) return;
    if (!settings || !settings.onboarding_completed) {
      navigate('/onboarding', { replace: true });
    }
  }, [loading, role, settings, pathname, navigate]);

  return (
    <div className="flex min-h-screen bg-background">
      <PageMeta title={meta.title} description={meta.description} />
      <GlobalSearch />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <MobileHeader />
        <main className="flex-1 overflow-auto min-w-0 pb-20 lg:pb-0">
          <Outlet />
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
};

export default Index;
