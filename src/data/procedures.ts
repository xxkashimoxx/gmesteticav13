import {
  Syringe,
  Sparkles,
  Droplet,
  Zap,
  Smile,
  Scan,
  Stars,
  Heart,
  type LucideIcon,
} from 'lucide-react';

export interface ProcedureCatalogItem {
  id: string;
  name: string;
  category: 'Harmonização' | 'Toxina' | 'Bioestimulador' | 'Skincare' | 'Tecnologia';
  description: string;
  duration: string; // ex: "60 min"
  price: number;
  sessionsRecommended: number;
  highlight?: string;
  icon: LucideIcon;
  // métricas/KPIs do procedimento
  monthlyBookings: number;
  monthlyLeads: number;
  conversionRate: number; // %
  revenueMonth: number;
}

export const procedureCatalog: ProcedureCatalogItem[] = [
  {
    id: 'preenchimento-labial',
    name: 'Preenchimento Labial',
    category: 'Harmonização',
    description: 'Hidratação e contorno labial com ácido hialurônico.',
    duration: '45 min',
    price: 1200,
    sessionsRecommended: 1,
    highlight: 'Mais procurado',
    icon: Smile,
    monthlyBookings: 28,
    monthlyLeads: 64,
    conversionRate: 43.7,
    revenueMonth: 33600,
  },
  {
    id: 'harmonizacao-completa',
    name: 'Harmonização Facial Completa',
    category: 'Harmonização',
    description: 'Avaliação 360° + preenchimentos estratégicos e botox.',
    duration: '2h',
    price: 4500,
    sessionsRecommended: 1,
    highlight: 'Top receita',
    icon: Stars,
    monthlyBookings: 9,
    monthlyLeads: 38,
    conversionRate: 23.6,
    revenueMonth: 40500,
  },
  {
    id: 'botox-testa-glabela',
    name: 'Botox - Testa e Glabela',
    category: 'Toxina',
    description: 'Toxina botulínica para suavizar rugas dinâmicas.',
    duration: '30 min',
    price: 1600,
    sessionsRecommended: 1,
    icon: Syringe,
    monthlyBookings: 22,
    monthlyLeads: 47,
    conversionRate: 46.8,
    revenueMonth: 35200,
  },
  {
    id: 'bioestimulador',
    name: 'Bioestimulador de Colágeno',
    category: 'Bioestimulador',
    description: 'Sculptra/Radiesse para firmeza e sustentação da pele.',
    duration: '60 min',
    price: 2400,
    sessionsRecommended: 3,
    icon: Sparkles,
    monthlyBookings: 14,
    monthlyLeads: 39,
    conversionRate: 35.9,
    revenueMonth: 33600,
  },
  {
    id: 'skinbooster',
    name: 'Skinbooster + Limpeza',
    category: 'Skincare',
    description: 'Hidratação profunda com microinjeções de ácido hialurônico.',
    duration: '60 min',
    price: 900,
    sessionsRecommended: 3,
    icon: Droplet,
    monthlyBookings: 18,
    monthlyLeads: 32,
    conversionRate: 56.2,
    revenueMonth: 16200,
  },
  {
    id: 'ultraformer',
    name: 'Ultraformer / Lifting',
    category: 'Tecnologia',
    description: 'Lifting não cirúrgico com ultrassom microfocado.',
    duration: '90 min',
    price: 3200,
    sessionsRecommended: 1,
    icon: Zap,
    monthlyBookings: 7,
    monthlyLeads: 24,
    conversionRate: 29.1,
    revenueMonth: 22400,
  },
  {
    id: 'preenchimento-zigomatico',
    name: 'Preenchimento Zigomático',
    category: 'Harmonização',
    description: 'Definição e projeção da região do zigoma.',
    duration: '60 min',
    price: 1500,
    sessionsRecommended: 1,
    icon: Scan,
    monthlyBookings: 11,
    monthlyLeads: 26,
    conversionRate: 42.3,
    revenueMonth: 16500,
  },
  {
    id: 'avaliacao',
    name: 'Avaliação Facial',
    category: 'Harmonização',
    description: 'Consulta inicial e planejamento personalizado.',
    duration: '40 min',
    price: 250,
    sessionsRecommended: 1,
    icon: Heart,
    monthlyBookings: 42,
    monthlyLeads: 110,
    conversionRate: 38.1,
    revenueMonth: 10500,
  },
];
