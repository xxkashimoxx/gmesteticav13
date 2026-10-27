// Disponibilidade pública da agenda: só dias/horários livres, sem dados de pacientes.
// GET ou POST -> { today, days: [{ date, weekday, label, times }] }
import { createClient } from "npm:@supabase/supabase-js@2";
import { loadAvailability } from "./availability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// Rate-limit simples em memória por IP (best-effort, reinicia a cada cold start)
const hits = new Map<string, { count: number; ts: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") return json({ error: "Método inválido." }, 405);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const entry = hits.get(ip);
  if (entry && now - entry.ts < WINDOW_MS) {
    entry.count++;
    if (entry.count > MAX_PER_WINDOW) return json({ error: "Muitas consultas. Tente em instantes." }, 429);
  } else {
    hits.set(ip, { count: 1, ts: now });
  }
  if (hits.size > 1000) hits.clear();

  try {
    const availability = await loadAvailability(db);
    if (!availability) return json({ error: "Agenda indisponível no momento." }, 503);
    return json(availability);
  } catch (error) {
    console.error("public-availability", error instanceof Error ? error.message : "unknown");
    return json({ error: "Agenda indisponível no momento." }, 503);
  }
});
