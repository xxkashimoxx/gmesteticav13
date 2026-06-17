export interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
  birthDate: string;
  procedures: Procedure[];
  totalValue: number;
  paidValue: number;
  pendingValue: number;
  nextAppointment?: string;
}

export interface Procedure {
  id: string;
  name: string;
  date: string;
  value: number;
  paid: boolean;
  description?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  procedure: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  value: number;
}

export type LeadTemperature = 'hot' | 'warm' | 'cold';
export type LeadStage =
  | 'novo'
  | 'contato'
  | 'qualificado'
  | 'agendamento'
  | 'convertido'
  | 'perdido';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: string;
  campaign?: string;
  procedureInterest: string;
  temperature: LeadTemperature;
  stage: LeadStage;
  score: number;
  estimatedValue: number;
  createdAt: string;
  lastInteraction: string;
  scheduledDate?: string;
  notes?: string;
}

export type IntegrationStatus = 'connected' | 'disconnected' | 'pending';

export interface Integration {
  id: string;
  name: string;
  category: 'ads' | 'analytics' | 'messaging' | 'crm' | 'automation';
  description: string;
  status: IntegrationStatus;
  metric?: { label: string; value: string };
}
