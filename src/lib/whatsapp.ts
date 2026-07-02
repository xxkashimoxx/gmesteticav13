// Utilitários para gerar links wa.me com mensagens pré-preenchidas.
// Fluxo semi-automático: o sistema abre o WhatsApp Web/App com a mensagem
// pronta e a Dra. só precisa clicar em "Enviar".

const CLINIC_NAME = 'GM Estética Avançada';

export type WhatsAppTemplateKind =
  | 'confirmation'
  | 'reminder_24h'
  | 'reminder_2h'
  | 'reschedule'
  | 'cancellation';

export interface AppointmentLike {
  patient_name: string;
  patient_phone: string | null;
  procedure_name: string | null;
  scheduled_at: string;
  previous_scheduled_at?: string | null;
}

/** Remove tudo que não for dígito e garante DDI 55 para números BR. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('55')) return digits;
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;
  return digits;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

export function buildMessage(kind: WhatsAppTemplateKind, apt: AppointmentLike): string {
  const nome = firstName(apt.patient_name);
  const procedimento = apt.procedure_name || 'seu procedimento';
  const data = fmtDate(apt.scheduled_at);
  const hora = fmtTime(apt.scheduled_at);

  switch (kind) {
    case 'confirmation':
      return (
        `Olá, ${nome}! 💗\n\n` +
        `Seu agendamento na ${CLINIC_NAME} está confirmado:\n` +
        `📅 ${data}\n⏰ ${hora}\n💉 ${procedimento}\n\n` +
        `Qualquer dúvida ou necessidade de remarcar, é só nos chamar por aqui. Até breve!`
      );
    case 'reminder_24h':
      return (
        `Oi, ${nome}! Passando para lembrar do seu atendimento amanhã na ${CLINIC_NAME}:\n\n` +
        `📅 ${data}\n⏰ ${hora}\n💉 ${procedimento}\n\n` +
        `Consegue confirmar sua presença? 💗`
      );
    case 'reminder_2h':
      return (
        `Oi, ${nome}! Seu horário na ${CLINIC_NAME} é hoje às ${hora} (${procedimento}).\n\n` +
        `Já estamos te esperando! Se estiver a caminho, é só nos avisar. 💗`
      );
    case 'reschedule': {
      const anterior = apt.previous_scheduled_at
        ? `${fmtDate(apt.previous_scheduled_at)} às ${fmtTime(apt.previous_scheduled_at)}`
        : 'o horário anterior';
      return (
        `Oi, ${nome}! Seu agendamento na ${CLINIC_NAME} foi remarcado.\n\n` +
        `De: ${anterior}\nPara: ${data} às ${hora}\n💉 ${procedimento}\n\n` +
        `Qualquer coisa, é só falar por aqui. 💗`
      );
    }
    case 'cancellation':
      return (
        `Oi, ${nome}. Seu agendamento na ${CLINIC_NAME} para ${data} às ${hora} (${procedimento}) foi cancelado.\n\n` +
        `Quer que a gente reagende? É só responder aqui. 💗`
      );
  }
}

export const TEMPLATE_LABELS: Record<WhatsAppTemplateKind, string> = {
  confirmation: 'Confirmação',
  reminder_24h: 'Lembrete 24h',
  reminder_2h: 'Lembrete 2h',
  reschedule: 'Aviso de remarcação',
  cancellation: 'Aviso de cancelamento',
};

export function buildWhatsAppUrl(kind: WhatsAppTemplateKind, apt: AppointmentLike): string | null {
  const phone = normalizePhone(apt.patient_phone);
  if (!phone) return null;
  const msg = buildMessage(kind, apt);
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}
