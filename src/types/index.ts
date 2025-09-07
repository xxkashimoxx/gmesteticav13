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