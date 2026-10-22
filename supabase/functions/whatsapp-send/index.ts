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
    const { db, user } = auth;
    if (missing().length) return json(req, { error: 'WhatsApp ainda não configurado. Consulte Integrações.' }, 503);
    const input = await req.json();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId ?? '')) {
      return json(req, { error: 'Identificador de envio inválido.' }, 400);
    }
    let phone: string;
    let name: string;
    let appointment = null;
    if (input.appointmentId) {
      const result = await db.from('appointments').select('id,patient_name,patient_phone,scheduled_at,status').eq('id', input.appointmentId).single();
      if (result.error) return json(req, { error: 'Agendamento não encontrado.' }, 404);
      appointment = result.data;
      phone = normalizePhone(appointment.patient_phone);
      name = appointment.patient_name;
    } else if (input.leadId) {
      const result = await db.from('leads').select('phone,name').eq('id', input.leadId).single();
      if (result.error) return json(req, { error: 'Lead não encontrado.' }, 404);
      phone = normalizePhone(result.data.phone);
      name = result.data.name;
    } else return json(req, { error: 'Selecione um lead ou agendamento salvo.' }, 400);

    // A request ID can never be reused for a different payload or recipient.
    const hash = await fingerprint({ user: user.id, phone, message: input.message, templateKind: input.templateKind,
      useTemplate: !!input.useTemplate, appointmentId: input.appointmentId ?? null, leadId: input.leadId ?? null });
    const previous = await db.from('whatsapp_messages').select('id,status,request_hash').eq('id', input.requestId).maybeSingle();
    if (previous.error) throw new Error('Database unavailable');
    if (previous.data) {
      if (previous.data.request_hash !== hash) return json(req, { error: 'Identificador já utilizado em outra mensagem.' }, 409);
      const accepted = ['accepted','sent','delivered','read'].includes(previous.data.status);
      return json(req, accepted ? { id: previous.data.id, status: previous.data.status } : {
        error: 'Este envio já foi processado ou está com resultado incerto. Confira o histórico antes de tentar novamente.', status: previous.data.status,
      }, accepted ? 200 : 409);
    }
    const limit = await db.from('whatsapp_messages').select('id', { count: 'exact', head: true })
      .eq('created_by', user.id).gte('created_at', new Date(Date.now() - 60000).toISOString());
    if (limit.error) throw new Error('Database unavailable');
    if ((limit.count ?? 0) >= 20) return json(req, { error: 'Limite de envios atingido. Aguarde um minuto.' }, 429);

    let payload: Record<string, unknown>;
    let body: string;
    if (input.useTemplate) {
      if (input.consentConfirmed !== true) return json(req, { error: 'Confirme que o paciente autorizou mensagens pelo WhatsApp.' }, 400);
      if (!appointment) return json(req, { error: 'Modelo de lembrete requer agendamento.' }, 400);
      if (['cancelled','completed','no_show'].includes(appointment.status) && input.templateKind !== 'cancellation') {
        return json(req, { error: 'Este agendamento não permite lembrete.' }, 409);
      }
      const templates = JSON.parse(Deno.env.get('WHATSAPP_TEMPLATES_JSON') ?? '{}');
      const template = templates[input.templateKind];
      if (!template || !/^[a-z0-9_]+$/.test(template.name) || !template.language) {
        return json(req, { error: 'Modelo aprovado ainda não configurado para este lembrete.' }, 409);
      }
      const date = new Date(appointment.scheduled_at);
      const parameters = [name.split(' ')[0], date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        date.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })];
      payload = { type: 'template', template: { name: template.name, language: { code: template.language },
        components: [{ type: 'body', parameters: parameters.map(text => ({ type: 'text', text })) }] } };
      body = `[Modelo ${template.name}] ${parameters.join(' · ')}`;
    } else {
      body = typeof input.message === 'string' ? input.message.trim() : '';
      if (!body || body.length > 4096) return json(req, { error: 'Mensagem deve ter entre 1 e 4096 caracteres.' }, 400);
      const last = await db.from('whatsapp_messages').select('provider_at').eq('phone', phone).eq('direction','in')
        .order('provider_at', { ascending: false }).limit(1).maybeSingle();
      if (last.error) throw new Error('Database unavailable');
      if (!windowOpen(last.data?.provider_at)) return json(req, { error: 'Fora da janela de 24 horas. Use um modelo aprovado ou peça ao paciente para iniciar a conversa.' }, 409);
      payload = { type: 'text', text: { body, preview_url: false } };
    }
    const inserted = await db.from('whatsapp_messages').insert({ id: input.requestId, phone, body, direction: 'out', status: 'sending',
      request_hash: hash, created_by: user.id, lead_id: input.appointmentId ? null : input.leadId,
      appointment_id: appointment?.id ?? null, appointment_scheduled_at: appointment?.scheduled_at ?? null, template_kind: input.templateKind ?? null,
      consent_at: input.useTemplate ? new Date().toISOString() : null });
    if (inserted.error?.code === '23505') return json(req, { error: 'Este envio já está em processamento.' }, 409);
    if (inserted.error) throw new Error('Database unavailable');
    try {
      const response = await fetch(graphUrl('/messages'), { method: 'POST', signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Bearer ${Deno.env.get('WHATSAPP_ACCESS_TOKEN')}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ messaging_product:'whatsapp', to:phone, biz_opaque_callback_data:input.requestId, ...payload }) });
      const result = await response.json();
      if (!response.ok || !result.messages?.[0]?.id) {
        await db.from('whatsapp_messages').update({ status: response.status >= 500 ? 'unknown' : 'failed',
          error_code: String(result.error?.code ?? response.status) }).eq('id', input.requestId).eq('status','sending');
        return json(req, { error: 'A Meta não confirmou o envio. Consulte o histórico antes de repetir.', code: result.error?.code }, 502);
      }
      const saved = await db.rpc('gm_whatsapp_status', { p_provider_id: result.messages[0].id, p_status:'accepted',
        p_at:new Date().toISOString(), p_error:null, p_request_id:input.requestId });
      if (saved.error) throw new Error('Persistence failed');
      return json(req, { id:input.requestId, status:'accepted' });
    } catch {
      await db.from('whatsapp_messages').update({ status:'unknown', error_code:'confirmation_unavailable' })
        .eq('id',input.requestId).eq('status','sending');
      return json(req, { error:'Resultado incerto. Confira o histórico; não reenvie automaticamente.' }, 502);
    }
  } catch {
    return json(req, { error:'Não foi possível preparar o envio. Verifique os dados e tente novamente.' }, 400);
  }
});

