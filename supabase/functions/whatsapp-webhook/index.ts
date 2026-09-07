// Webhook oficial da Meta WhatsApp Cloud API.
// GET valida o webhook. POST recebe mensagens/status, grava no Supabase e pode responder com IA.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') ?? '';
const META_APP_SECRET = Deno.env.get('META_APP_SECRET') ?? '';
const ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN') ?? '';
const ENV_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? '';
const API_VERSION = Deno.env.get('WHATSAPP_API_VERSION') ?? 'v23.0';
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function validMetaSignature(raw: string, signature: string | null) {
  if (!META_APP_SECRET) return true; // permite configuração inicial; em produção configure META_APP_SECRET.
  if (!signature?.startsWith('sha256=')) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(META_APP_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw));
  return `sha256=${hex(digest)}` === signature;
}

async function getSettings() {
  const { data } = await supabase.from('whatsapp_settings').select('*').eq('id', 1).maybeSingle();
  return data ?? {
    auto_reply_enabled: false,
    phone_number_id: null,
    api_version: API_VERSION,
    handoff_keywords: ['atendente', 'humano', 'pessoa', 'recepção', 'recepcao', 'falar com a doutora'],
  };
}

async function sendText(to: string, message: string, settings: any) {
  const phoneNumberId = ENV_PHONE_NUMBER_ID || settings?.phone_number_id;
  const version = settings?.api_version || API_VERSION;
  if (!ACCESS_TOKEN || !phoneNumberId) {
    throw new Error('WhatsApp ainda sem WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID');
  }

  const res = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body: message },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Meta ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function buildMemory() {
  const { data } = await supabase
    .from('ai_training_examples')
    .select('question,answer,corrected_answer,approved,source')
    .order('created_at', { ascending: false })
    .limit(60);

  const useful = (data ?? []).filter((x: any) => x.approved || x.corrected_answer);
  return useful
    .slice(0, 40)
    .map((x: any) => `Cliente: ${x.question}\nResposta preferida: ${x.corrected_answer || x.answer}`)
    .join('\n\n');
}

async function buildRecentConversation(conversationId: string) {
  const { data } = await supabase
    .from('whatsapp_messages')
    .select('sender,body,created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(14);

  return (data ?? [])
    .reverse()
    .map((m: any) => `${m.sender === 'client' ? 'Cliente' : 'Clínica'}: ${m.body ?? ''}`)
    .join('\n');
}

async function generateReply(message: string, conversationId: string, displayName?: string | null) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY não configurada');
  const [memory, history] = await Promise.all([buildMemory(), buildRecentConversation(conversationId)]);

  const system = `Você atende clientes da GM Estética Avançada pelo WhatsApp.\n\nREGRAS:\n- Português brasileiro natural, humano, curto e claro.\n- Comece pela dúvida ou incômodo que a cliente descreveu; não despeje lista de procedimentos.\n- Use as palavras da própria cliente quando possível.\n- Explique de forma simples.\n- Quando fizer sentido, cite no máximo 1 ou 2 possibilidades e a diferença prática entre elas.\n- Faça no máximo uma pergunta útil por resposta.\n- Não invente preço, diagnóstico, contraindicação, resultado, disponibilidade ou promessa clínica.\n- Não confirme agendamento sem o sistema ter um horário real.\n- Se houver correção humana na memória, ela tem prioridade máxima.\n- Normalmente responda em 40 a 90 palavras.\n- Não diga que você é uma IA.\n\nMEMÓRIA APROVADA DA GM:\n${memory || '(sem exemplos aprovados ainda)'}`;

  const prompt = `Nome do contato: ${displayName || 'cliente'}\n\nHISTÓRICO RECENTE:\n${history}\n\nMENSAGEM NOVA:\n${message}\n\nResponda somente com o texto que deve ser enviado no WhatsApp.`;

  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent', {
    method: 'POST',
    headers: { 'x-goog-api-key': GEMINI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.55,
        maxOutputTokens: 650,
        thinkingConfig: { thinkingLevel: 'low' },
      },
    }),
  });

  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('').trim();
  if (!text) throw new Error('Gemini retornou resposta vazia');
  return text;
}

function textFromMessage(message: any) {
  if (message?.type === 'text') return message.text?.body ?? '';
  if (message?.type === 'button') return message.button?.text ?? '';
  if (message?.type === 'interactive') {
    return message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '';
  }
  return '';
}

async function processStatus(status: any) {
  if (!status?.id) return;
  await supabase
    .from('whatsapp_messages')
    .update({ status: status.status ?? null, raw_payload: status })
    .eq('meta_message_id', status.id);
}

async function processInbound(value: any, message: any) {
  const waId = String(message.from ?? '').trim();
  if (!waId || !message.id) return;

  const existing = await supabase
    .from('whatsapp_messages')
    .select('id')
    .eq('meta_message_id', message.id)
    .maybeSingle();
  if (existing.data) return;

  const displayName = value?.contacts?.find((c: any) => c.wa_id === waId)?.profile?.name ?? null;
  const { data: contact, error: contactError } = await supabase
    .from('whatsapp_contacts')
    .upsert(
      {
        wa_id: waId,
        phone: waId,
        display_name: displayName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'wa_id' },
    )
    .select('*')
    .single();
  if (contactError || !contact) throw contactError ?? new Error('Falha ao criar contato');

  let { data: conversation } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('contact_id', contact.id)
    .in('status', ['open', 'human'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    const created = await supabase
      .from('whatsapp_conversations')
      .insert({ contact_id: contact.id, status: 'open', ai_enabled: true, last_message_at: new Date().toISOString() })
      .select('*')
      .single();
    if (created.error || !created.data) throw created.error ?? new Error('Falha ao abrir conversa');
    conversation = created.data;
  }

  const body = textFromMessage(message);
  await supabase.from('whatsapp_messages').insert({
    conversation_id: conversation.id,
    meta_message_id: message.id,
    direction: 'inbound',
    sender: 'client',
    message_type: message.type ?? 'unknown',
    body: body || `[${message.type ?? 'mensagem'}]`,
    status: 'received',
    raw_payload: message,
  });
  await supabase
    .from('whatsapp_conversations')
    .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', conversation.id);

  const settings = await getSettings();
  const normalized = body.toLocaleLowerCase('pt-BR');
  const wantsHuman = (settings.handoff_keywords ?? []).some((word: string) => normalized.includes(String(word).toLocaleLowerCase('pt-BR')));

  if (wantsHuman) {
    await supabase
      .from('whatsapp_conversations')
      .update({ status: 'human', ai_enabled: false, updated_at: new Date().toISOString() })
      .eq('id', conversation.id);
    if (ACCESS_TOKEN && (ENV_PHONE_NUMBER_ID || settings.phone_number_id)) {
      const handoff = 'Claro. Vou deixar seu atendimento com uma pessoa da equipe da GM. Assim que possível, alguém continua por aqui.';
      const sent = await sendText(waId, handoff, settings);
      await supabase.from('whatsapp_messages').insert({
        conversation_id: conversation.id,
        meta_message_id: sent?.messages?.[0]?.id ?? null,
        direction: 'outbound',
        sender: 'system',
        message_type: 'text',
        body: handoff,
        status: 'sent',
        raw_payload: sent,
      });
    }
    return;
  }

  if (!body || message.type !== 'text') return;
  if (!settings.auto_reply_enabled || !conversation.ai_enabled || conversation.status === 'human') return;

  const reply = await generateReply(body, conversation.id, displayName);
  const sent = await sendText(waId, reply, settings);
  await supabase.from('whatsapp_messages').insert({
    conversation_id: conversation.id,
    meta_message_id: sent?.messages?.[0]?.id ?? null,
    direction: 'outbound',
    sender: 'ai',
    message_type: 'text',
    body: reply,
    status: 'sent',
    raw_payload: sent,
  });
  await supabase
    .from('whatsapp_conversations')
    .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', conversation.id);
}

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && VERIFY_TOKEN && token === VERIFY_TOKEN) {
      return new Response(challenge ?? '', { status: 200 });
    }
    return new Response('forbidden', { status: 403 });
  }

  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const raw = await req.text();
  if (!(await validMetaSignature(raw, req.headers.get('x-hub-signature-256')))) {
    return new Response('invalid signature', { status: 401 });
  }

  try {
    const payload = JSON.parse(raw || '{}');
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') continue;
        const value = change.value ?? {};
        for (const status of value.statuses ?? []) await processStatus(status);
        for (const message of value.messages ?? []) await processInbound(value, message);
      }
    }
    return json({ ok: true });
  } catch (error) {
    console.error('whatsapp-webhook', error);
    // A Meta não deve ficar reenviando indefinidamente por uma falha interna de IA.
    return json({ ok: false, error: String(error) }, 200);
  }
});
