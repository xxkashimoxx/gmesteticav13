// Configuração local do WhatsApp da clínica.
// Persistida no navegador; posteriormente migra para clinic_settings/API oficial.
import { normalizePhone } from './whatsapp';

const KEY = 'gm.whatsapp.v1';

export interface ClinicWhatsAppConfig {
  /** Número do WhatsApp da clínica (só dígitos, com DDI). */
  number: string;
  /** Link do grupo de comunicação interna (chat.whatsapp.com/...). */
  groupUrl: string;
}

const DEFAULTS: ClinicWhatsAppConfig = { number: '', groupUrl: '' };

export function loadClinicWhatsApp(): ClinicWhatsAppConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function saveClinicWhatsApp(cfg: ClinicWhatsAppConfig) {
  const normalized: ClinicWhatsAppConfig = {
    number: normalizePhone(cfg.number) ?? '',
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
