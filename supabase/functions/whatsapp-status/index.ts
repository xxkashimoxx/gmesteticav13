import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

const required = ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_GRAPH_API_VERSION', 'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_APP_SECRET'];
const missing = () => required.filter(key => !Deno.env.get(key));
const admin = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } });

function headers(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://gmesteticav13.vercel.app').split(',').map(s => s.trim());
  return { 'Content-Type': 'application/json', 'Vary': 'Origin',
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS' };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headers(req) });
}

async function authorize(req: Request) {
  const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!jwt) return null;
  const db = admin();
  const { data, error } = await db.auth.getUser(jwt);
  if (error || !data.user) return null;
  const roles = await db.from('user_roles').select('role').eq('user_id', data.user.id).in('role', ['admin', 'staff']);
  if (roles.error || !roles.data?.length) return null;
  return { db, user: data.user };
}

function graphUrl(path: string) {
  const version = Deno.env.get('WHATSAPP_GRAPH_API_VERSION') ?? '';
  const phone = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? '';
  if (!/^v\d+\.\d+$/.test(version) || !/^\d+$/.test(phone)) throw new Error('Configuração da Meta inválida.');
  return `https://graph.facebook.com/${version}/${phone}${path}`;
}

function normalizePhone(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  const phone = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  if (!/^[1-9]\d{9,14}$/.test(phone)) throw new Error('Telefone inválido. Informe DDI e DDD.');
  return phone;
}

async function validSignature(raw, signature, secret) {
  if (!secret || !/^sha256=[a-f0-9]{64}$/.test(signature ?? '')) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const bytes = Uint8Array.from(signature.slice(7).match(/../g), x => parseInt(x, 16));
  return crypto.subtle.verify('HMAC', key, bytes, new TextEncoder().encode(raw));
}

function windowOpen(timestamp, now = Date.now()) {
  const time = Date.parse(timestamp ?? '');
  return Number.isFinite(time) && time <= now && now - time < 24 * 60 * 60 * 1000;
}

async function fingerprint(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}



Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: headers(req) });
  if (req.method !== 'POST') return json(req, { error: 'Método inválido' }, 405);
  try {
    const auth = await authorize(req);
    if (!auth) return json(req, { error: 'Entre com uma conta autorizada da clínica.' }, 401);
    const absent = missing();
    const recent = await auth.db.from('whatsapp_messages').select('id,phone,direction,body,status,created_at,error_code,lead_id')
      .order('created_at', { ascending: false }).limit(50);
    if (recent.error) return json(req, { error: 'Estrutura do WhatsApp indisponível.' }, 503);
    let connected = false;
    let phone = null;
    if (!absent.length) {
      const response = await fetch(graphUrl('?fields=display_phone_number,verified_name'), {
        headers: { Authorization: `Bearer ${Deno.env.get('WHATSAPP_ACCESS_TOKEN')}` }, signal: AbortSignal.timeout(10000),
      });
      const data = await response.json();
      connected = response.ok && !!data.id;
      if (connected) phone = data.display_phone_number;
    }
    return json(req, { connected, missing: absent, phone, messages: recent.data,
      webhookUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-webhook`,
      templatesConfigured: !!Deno.env.get('WHATSAPP_TEMPLATES_JSON'),
      autoReplyEnabled: false, automaticRemindersEnabled: false });
  } catch {
    return json(req, { error: 'Não foi possível consultar a Meta. Tente novamente.' }, 502);
  }
});

