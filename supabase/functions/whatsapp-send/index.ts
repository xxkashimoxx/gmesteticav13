import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN') ?? '';
const ENV_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? '';
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
    const { conversationId, message } = await req.json();
    if (!conversationId || typeof message !== 'string' || !message.trim()) {
      return json({ error: 'conversationId e message são obrigatórios' }, 400);
    }

    const { data: conversation, error: convError } = await supabase
      .from('whatsapp_conversations')
      .select('id, contact_id')
      .eq('id', conversationId)
      .single();
    if (convError || !conversation) return json({ error: 'Conversa não encontrada' }, 404);

    const { data: contact, error: contactError } = await supabase
      .from('whatsapp_contacts')
      .select('wa_id')
      .eq('id', conversation.contact_id)
      .single();
    if (contactError || !contact?.wa_id) return json({ error: 'Contato não encontrado' }, 404);

    const { data: settings } = await supabase
      .from('whatsapp_settings')
      .select('phone_number_id,api_version')
      .eq('id', 1)
      .maybeSingle();

    const phoneNumberId = ENV_PHONE_NUMBER_ID || settings?.phone_number_id;
    const version = settings?.api_version || API_VERSION;
    if (!ACCESS_TOKEN || !phoneNumberId) {
      return json({ error: 'Credenciais oficiais do WhatsApp ainda não configuradas' }, 503);
    }

    const metaRes = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: contact.wa_id,
        type: 'text',
        text: { preview_url: false, body: message.trim() },
      }),
    });

    const meta = await metaRes.json().catch(() => ({}));
    if (!metaRes.ok) return json({ error: 'Falha na API da Meta', detail: meta }, 502);

    const metaMessageId = meta?.messages?.[0]?.id ?? null;
    const { error: insertError } = await supabase.from('whatsapp_messages').insert({
      conversation_id: conversationId,
      meta_message_id: metaMessageId,
      direction: 'outbound',
      sender: 'human',
      message_type: 'text',
      body: message.trim(),
      status: 'sent',
      raw_payload: meta,
    });
    if (insertError) console.error('whatsapp-send insert', insertError);

    await supabase
      .from('whatsapp_conversations')
      .update({
        status: 'human',
        ai_enabled: false,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    return json({ ok: true, metaMessageId });
  } catch (error) {
    console.error('whatsapp-send', error);
    return json({ error: String(error) }, 500);
  }
});
