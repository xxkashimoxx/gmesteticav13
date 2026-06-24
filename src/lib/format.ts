export const brl = (n: number) =>
  Number(n || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

export const LEAD_SOURCES = [
  'Meta Ads',
  'Google Ads',
  'Instagram',
  'TikTok Ads',
  'WhatsApp',
  'Indicação',
  'Site',
  'Outros',
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export function daysSince(iso?: string | null) {
  if (!iso) return Infinity;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export function startOfWeek(d = new Date()) {
  const x = new Date(d);
  const day = x.getDay();
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}
