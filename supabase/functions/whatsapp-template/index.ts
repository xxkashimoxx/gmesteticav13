import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN') ?? '';
const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? '';
const API_VERSION = Deno.env.get('WHATSAPP_API_VERSION') ?? 'v23.0';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  try {
    const { to, templateName, languageCode = 'pt_BR', components = [], conversationId = null } = await req.json();
    if (!to || !templateName) return json({ error: 'to e templateName são obrigatórios' }, 400);
    if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) return json({ error: 'Credenciais oficiais do WhatsApp ainda não configuradas' }, 503);

    const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      }),
    });

    const meta = await res.json().catch(() => ({}));
    if (!res.ok) return json({ error: 'Falha na API da Meta', detail: meta }, 502);

    if (conversationId) {
      await supabase.from('whatsapp_messages').insert({
        conversation_id: conversationId,
        meta_message_id: meta?.messages?.[0]?.id ?? null,
        direction: 'outbound',
        sender: 'system',
        message_type: 'template',
        body: `[template:${templateName}]`,
        status: 'sent',
        raw_payload: meta,
      });
      await supabase
        .from('whatsapp_conversations')
        .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    }

    return json({ ok: true, metaMessageId: meta?.messages?.[0]?.id ?? null });
  } catch (error) {
    console.error('whatsapp-template', error);
    return json({ error: String(error) }, 500);
  }
});
