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