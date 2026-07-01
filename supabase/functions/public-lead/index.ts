// Formulário público de captação de leads
// POST { name, phone, email?, procedure_interest?, source?, notes? }
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const BodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(30),
  email: z.string().email().max(160).optional().or(z.literal('')),
  procedure_interest: z.string().max(160).optional().or(z.literal('')),
  source: z.string().max(60).optional(),
  notes: z.string().max(1000).optional(),
});

// Rate-limit simples em memória por IP (best-effort, reset a cada cold start)
const hits = new Map<string, { count: number; ts: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405, headers: corsHeaders });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const entry = hits.get(ip);
  if (entry && now - entry.ts < WINDOW_MS) {
    entry.count++;
    if (entry.count > MAX_PER_WINDOW) {
      return new Response(JSON.stringify({ error: 'muitas tentativas, tente em instantes' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } else {
    hits.set(ip, { count: 1, ts: now });
  }

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const d = parsed.data;

    // Score simples para lead orgânico do formulário
    let score = 55;
    if (d.email) score += 10;
    if (d.procedure_interest) score += 15;
    const temperature = score >= 75 ? 'hot' : score >= 55 ? 'warm' : 'cold';

    const { error } = await supabase.from('leads').insert({
      name: d.name,
      phone: d.phone,
      email: d.email || null,
      source: d.source || 'Formulário site',
      procedure_interest: d.procedure_interest || null,
      temperature,
      stage: 'novo',
      score,
      estimated_value: 0,
      notes: d.notes || null,
    });

    if (error) {
      console.error('insert lead error', error);
      return new Response(JSON.stringify({ error: 'falha ao registrar' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
