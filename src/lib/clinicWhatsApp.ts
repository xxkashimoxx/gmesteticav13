// Configuração local do WhatsApp da clínica.
// Persistida no navegador; posteriormente migra para clinic_settings/API oficial.
const KEY = 'gm.whatsapp.v1';

export interface ClinicWhatsAppConfig {
  /** Número do WhatsApp da clínica (só dígitos, com DDI). */
  number: string;
  /** Link do grupo de comunicação interna (chat.whatsapp.com/...). */
  groupUrl: string;
}

const CLINIC_NUMBER = '5521986083249';
const DEFAULTS: ClinicWhatsAppConfig = { number: CLINIC_NUMBER, groupUrl: '' };

export function loadClinicWhatsApp(): ClinicWhatsAppConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const stored = JSON.parse(raw) as Partial<ClinicWhatsAppConfig>;
    const config = {
      number: CLINIC_NUMBER,
      groupUrl: typeof stored.groupUrl === 'string' ? stored.groupUrl : '',
    };
    if (stored.number !== CLINIC_NUMBER) localStorage.setItem(KEY, JSON.stringify(config));
    return config;
  } catch {
    return DEFAULTS;
  }
}

export function saveClinicWhatsApp(cfg: ClinicWhatsAppConfig) {
  const normalized: ClinicWhatsAppConfig = {
    number: CLINIC_NUMBER,
    groupUrl: cfg.groupUrl.trim(),
  };
  localStorage.setItem(KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent('gm:whatsapp-updated'));
  return normalized;
}

/** URL wa.me para conversa direta com a clínica. */
export function clinicWaMeUrl(message?: string): string | null {
  const { number } = loadClinicWhatsApp();
  if (!number) return null;
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** URL do WhatsApp Web (nova aba, útil pra recepção manter aberto). */
export const WHATSAPP_WEB_URL = 'https://web.whatsapp.com/';
