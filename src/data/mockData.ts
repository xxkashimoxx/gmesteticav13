import { Patient, Appointment, Procedure } from '../types';

export const mockProcedures: Procedure[] = [
  {
    id: '1',
    name: 'Harmonização Facial - Preenchimento',
    date: '2024-01-15',
    value: 1200,
    paid: true,
    description: 'Preenchimento labial com ácido hialurônico'
  },
  {
    id: '2',
    name: 'Botox Testa',
    date: '2024-02-10',
    value: 800,
    paid: false,
    description: 'Aplicação de toxina botulínica na região da testa'
  },
];

export const mockPatients: Patient[] = [
  {
    id: '1',
    name: 'Maria Silva',
    phone: '(11) 99999-9999',
    email: 'maria@email.com',
    birthDate: '1990-05-15',
    procedures: mockProcedures,
    totalValue: 2000,
    paidValue: 1200,
    pendingValue: 800,
    nextAppointment: '2024-03-15T14:00:00'
  },
  {
    id: '2',
    name: 'Ana Costa',
    phone: '(11) 88888-8888',
    email: 'ana@email.com',
    birthDate: '1985-08-22',
    procedures: [
      {
        id: '3',
        name: 'Harmonização Facial Completa',
        date: '2024-01-20',
        value: 2500,
        paid: true,
        description: 'Preenchimento + Botox completo'
      }
    ],
    totalValue: 2500,
    paidValue: 2500,
    pendingValue: 0,
    nextAppointment: '2024-04-20T10:00:00'
  },
  {
    id: '3',
    name: 'Carla Santos',
    phone: '(11) 77777-7777',
    email: 'carla@email.com',
    birthDate: '1992-12-10',
    procedures: [
      {
        id: '4',
        name: 'Preenchimento Zigomático',
        date: '2024-02-05',
        value: 1500,
        paid: false,
        description: 'Harmonização da região do zigoma'
      }
    ],
    totalValue: 1500,
    paidValue: 0,
    pendingValue: 1500,
    nextAppointment: '2024-03-05T16:30:00'
  }
];

export const mockAppointments: Appointment[] = [
  {
    id: '1',
    patientId: '1',
    patientName: 'Maria Silva',
    procedure: 'Retoque Preenchimento Labial',
    date: '2024-03-15',
    time: '14:00',
    status: 'scheduled',
    value: 600
  },
  {
    id: '2',
    patientId: '2',
    patientName: 'Ana Costa',
    procedure: 'Manutenção Botox',
    date: '2024-04-20',
    time: '10:00',
    status: 'scheduled',
    value: 800
  },
  {
    id: '3',
    patientId: '3',
    patientName: 'Carla Santos',
    procedure: 'Avaliação Pós-Procedimento',
    date: '2024-03-05',
    time: '16:30',
    status: 'scheduled',
    value: 0
  }
];
import { Lead, Integration } from '../types';

export const mockLeads: Lead[] = [
  {
    id: 'l1',
    name: 'Camila Rocha',
    phone: '(11) 98877-1122',
    email: 'camila.rocha@email.com',
    source: 'Instagram Ads',
    campaign: 'Harmonização - Junho',
    procedureInterest: 'Harmonização Facial Completa',
    temperature: 'hot',
    stage: 'agendamento',
    score: 92,
    estimatedValue: 4500,
    createdAt: '2026-06-14',
    lastInteraction: '2026-06-16',
    scheduledDate: '2026-06-19',
    notes: 'Já respondeu orçamento, quer agendar avaliação esta semana.'
  },
  {
    id: 'l2',
    name: 'Juliana Mendes',
    phone: '(11) 97766-3344',
    source: 'Meta Ads',
    campaign: 'Botox - Conversão',
    procedureInterest: 'Botox Testa e Glabela',
    temperature: 'hot',
    stage: 'qualificado',
    score: 85,
    estimatedValue: 1600,
    createdAt: '2026-06-13',
    lastInteraction: '2026-06-16',
    notes: 'Pediu valores e disponibilidade para sábado.'
  },
  {
    id: 'l3',
    name: 'Renata Lopes',
    phone: '(11) 96655-2211',
    email: 'renata@email.com',
    source: 'Google Ads',
    campaign: 'Preenchimento Labial',
    procedureInterest: 'Preenchimento Labial',
    temperature: 'warm',
    stage: 'contato',
    score: 64,
    estimatedValue: 1800,
    createdAt: '2026-06-10',
    lastInteraction: '2026-06-15',
    notes: 'Comparou preços com outra clínica.'
  },
  {
    id: 'l4',
    name: 'Patrícia Alves',
    phone: '(11) 95544-9988',
    source: 'WhatsApp',
    procedureInterest: 'Bioestimulador de Colágeno',
    temperature: 'warm',
    stage: 'qualificado',
    score: 58,
    estimatedValue: 2400,
    createdAt: '2026-06-09',
    lastInteraction: '2026-06-14',
    notes: 'Quer entender diferença entre Sculptra e Radiesse.'
  },
  {
    id: 'l5',
    name: 'Aline Costa',
    phone: '(11) 94433-7766',
    source: 'Indicação',
    procedureInterest: 'Limpeza de Pele + Skinbooster',
    temperature: 'cold',
    stage: 'novo',
    score: 32,
    estimatedValue: 900,
    createdAt: '2026-06-05',
    lastInteraction: '2026-06-08',
    notes: 'Demonstrou interesse mas não respondeu follow-up.'
  },
  {
    id: 'l6',
    name: 'Fernanda Dias',
    phone: '(11) 93322-5544',
    source: 'TikTok Ads',
    campaign: 'Awareness - Harmonização',
    procedureInterest: 'Avaliação Facial',
    temperature: 'cold',
    stage: 'novo',
    score: 24,
    estimatedValue: 0,
    createdAt: '2026-06-03',
    lastInteraction: '2026-06-04',
    notes: 'Curtiu vídeo e enviou DM perguntando preço.'
  },
  {
    id: 'l7',
    name: 'Larissa Souza',
    phone: '(11) 92211-4433',
    email: 'larissa@email.com',
    source: 'Meta Ads',
    campaign: 'Lead Gen - Bioestimulador',
    procedureInterest: 'Ultraformer / Lifting',
    temperature: 'hot',
    stage: 'agendamento',
    score: 88,
    estimatedValue: 3200,
    createdAt: '2026-06-15',
    lastInteraction: '2026-06-16',
    scheduledDate: '2026-06-20',
    notes: 'Confirmou pré-avaliação online.'
  }
];

export const mockIntegrations: Integration[] = [
  {
    id: 'meta-ads',
    name: 'Meta Ads (Facebook & Instagram)',
    category: 'ads',
    description: 'Sincronize campanhas, conjuntos de anúncios e leads do Facebook/Instagram.',
    status: 'connected',
    metric: { label: 'Leads no mês', value: '142' }
  },
  {
    id: 'google-ads',
    name: 'Google Ads',
    category: 'ads',
    description: 'Acompanhe palavras-chave, CPL e conversões diretamente no painel.',
    status: 'connected',
    metric: { label: 'CPL médio', value: 'R$ 38,40' }
  },
  {
    id: 'tiktok-ads',
    name: 'TikTok Ads',
    category: 'ads',
    description: 'Importe leads e métricas de campanhas de awareness e conversão.',
    status: 'pending',
    metric: { label: 'Campanhas', value: '3 ativas' }
  },
  {
    id: 'ga4',
    name: 'Google Analytics 4',
    category: 'analytics',
    description: 'Veja origem do tráfego, jornada do paciente e taxa de conversão do site.',
    status: 'connected',
    metric: { label: 'Visitantes/mês', value: '8.421' }
  },
  {
    id: 'meta-pixel',
    name: 'Meta Pixel & Conversions API',
    category: 'analytics',
    description: 'Envie conversões offline (agendamentos e procedimentos) de volta para otimização.',
    status: 'disconnected'
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business API',
    category: 'messaging',
    description: 'Receba leads direto no WhatsApp e dispare follow-ups automáticos.',
    status: 'connected',
    metric: { label: 'Conversas hoje', value: '23' }
  },
  {
    id: 'instagram-dm',
    name: 'Instagram Direct',
    category: 'messaging',
    description: 'Centralize DMs de campanhas e classifique leads automaticamente.',
    status: 'pending'
  },
  {
    id: 'rd-station',
    name: 'RD Station / HubSpot',
    category: 'crm',
    description: 'Sincronize leads e oportunidades com seu CRM externo.',
    status: 'disconnected'
  },
  {
    id: 'zapier',
    name: 'Zapier / Make',
    category: 'automation',
    description: 'Crie automações entre formulários, agenda e campanhas pagas.',
    status: 'connected',
    metric: { label: 'Zaps ativos', value: '6' }
  }
];
