// Meta (Facebook/Instagram) Lead Ads webhook
// GET  -> verificação do webhook (hub.challenge)
// POST -> recebe leadgen events, busca detalhes do lead e insere em public.leads
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const VERIFY_TOKEN = Deno.env.get('META_LEAD_VERIFY_TOKEN')!;
const META_ACCESS_TOKEN = Deno.env.get('META_ACCESS_TOKEN'); // opcional (para buscar detalhes)

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

function scoreFromLead(fields: Record<string, string>): { temperature: 'hot' | 'warm' | 'cold'; score: number } {
  // Heurística inicial: presença de telefone + interesse específico eleva score
  let score = 40;
  if (fields.phone_number || fields.phone) score += 25;
  if (fields.email) score += 10;
  if (Object.keys(fields).some((k) => k.toLowerCase().includes('procedimento') || k.toLowerCase().includes('interesse'))) score += 15;
  const temperature = score >= 75 ? 'hot' : score >= 55 ? 'warm' : 'cold';
  return { temperature, score };
}

async function fetchLeadDetails(leadgenId: string): Promise<Record<string, string> | null> {
  if (!META_ACCESS_TOKEN) return null;
  const url = `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${META_ACCESS_TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const fields: Record<string, string> = {};
  for (const f of data.field_data ?? []) {
    fields[f.name] = Array.isArray(f.values) ? f.values[0] : f.values;
  }
  return fields;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Verificação inicial do webhook pela Meta
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return new Response(challenge ?? '', { status: 200 });
    }
    return new Response('forbidden', { status: 403 });
  }

  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const entries = body.entry ?? [];
    let inserted = 0;

    for (const entry of entries) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'leadgen') continue;
        const v = change.value ?? {};
        const leadgenId = v.leadgen_id as string | undefined;
        const formId = v.form_id as string | undefined;
        const campaign = v.campaign_name ?? v.ad_name ?? v.adgroup_name ?? null;

        const fields = leadgenId ? await fetchLeadDetails(leadgenId) : null;
        const name = fields?.full_name || fields?.name || 'Lead sem nome';
        const phone = fields?.phone_number || fields?.phone || null;
        const email = fields?.email || null;
        const interest =
          fields?.procedimento_de_interesse ||
          fields?.interesse ||
          fields?.procedure ||
          null;

        const { temperature, score } = scoreFromLead(fields ?? {});

        const { error } = await supabase.from('leads').insert({
          name,
          phone,
          email,
          source: 'Meta Ads',
          campaign,
          procedure_interest: interest,
          temperature,
          stage: 'novo',
          score,
          estimated_value: 0,
          notes: `Meta form_id=${formId ?? '?'} leadgen_id=${leadgenId ?? '?'}`,
        });
        if (!error) inserted++;
      }
    }

    return new Response(JSON.stringify({ ok: true, inserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('meta-lead-webhook error', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
