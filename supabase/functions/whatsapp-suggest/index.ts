// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface Body {
  leadId?: string;
  appointmentId?: string;
  intent?: string;
  lastMessage?: string;
}

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  try { return new Date(d).toLocaleString("pt-BR"); } catch { return d; }
}

async function buildContext(supabase: any, body: Body): Promise<string> {
  const lines: string[] = [];
  if (body.leadId) {
    const { data: lead } = await supabase.from("leads").select("*").eq("id", body.leadId).maybeSingle();
    if (lead) {
      lines.push(`PACIENTE/LEAD: ${lead.name}`);
      lines.push(`Origem: ${lead.source}${lead.campaign ? " · " + lead.campaign : ""}`);
      lines.push(`Etapa: ${lead.stage} · Temperatura: ${lead.temperature} · Score: ${lead.score}`);
      if (lead.procedure_interest) lines.push(`Interesse: ${lead.procedure_interest}`);
      if (lead.estimated_value) lines.push(`Ticket estimado: R$ ${lead.estimated_value}`);
      if (lead.notes) lines.push(`Notas: ${lead.notes}`);
      lines.push(`Último contato: ${fmt(lead.last_contact_at)}`);

      const { data: interactions } = await supabase.from("lead_interactions").select("channel, direction, message, created_at").eq("lead_id", body.leadId).order("created_at", { ascending: false }).limit(30);
      if (interactions?.length) {
        const lastByChannel = new Map<string, any>();
        let lastInbound: any = null, lastOutbound: any = null;
        for (const i of interactions) {
          if (!lastByChannel.has(i.channel)) lastByChannel.set(i.channel, i);
          if (!lastInbound && i.direction === "in") lastInbound = i;
          if (!lastOutbound && i.direction === "out") lastOutbound = i;
        }
        lines.push(`\nÚLTIMA INTERAÇÃO POR CANAL:`);
        for (const [channel, i] of lastByChannel) {
          const dir = i.direction === "in" ? "← Recebida" : i.direction === "out" ? "→ Enviada" : "· Nota";
          lines.push(`- ${channel}: [${fmt(i.created_at)}] ${dir} — "${i.message}"`);
        }
        if (lastInbound) lines.push(`\nÚLTIMA MENSAGEM RECEBIDA DO PACIENTE (${lastInbound.channel}, ${fmt(lastInbound.created_at)}):\n"${lastInbound.message}"`);
        if (lastOutbound) lines.push(`\nÚLTIMA MENSAGEM ENVIADA PELA CLÍNICA (${lastOutbound.channel}, ${fmt(lastOutbound.created_at)}):\n"${lastOutbound.message}"`);
        lines.push("\nHISTÓRICO COMPLETO (últimas 10, mais recente primeiro):");
        for (const i of interactions.slice(0, 10)) {
          const dir = i.direction === "in" ? "← Recebida" : i.direction === "out" ? "→ Enviada" : "· Nota";
          lines.push(`- [${fmt(i.created_at)}] ${dir} (${i.channel}): ${i.message}`);
        }
      }

      const { data: appts } = await supabase.from("appointments").select("procedure_name, scheduled_at, status, value, notes").ilike("patient_name", lead.name).order("scheduled_at", { ascending: false }).limit(6);
      if (appts?.length) {
        lines.push("\nATENDIMENTOS DO PACIENTE:");
        for (const a of appts) lines.push(`- ${fmt(a.scheduled_at)} · ${a.procedure_name ?? "—"} · ${a.status} · R$ ${a.value ?? 0}${a.notes ? ` · motivo/obs: ${a.notes}` : ""}`);
      }
    }
  }

  if (body.appointmentId) {
    const { data: apt } = await supabase.from("appointments").select("*").eq("id", body.appointmentId).maybeSingle();
    if (apt) {
      lines.push(`\nAGENDAMENTO EM FOCO:`);
      lines.push(`Paciente: ${apt.patient_name}`);
      lines.push(`Procedimento (motivo da consulta): ${apt.procedure_name ?? "—"}`);
      lines.push(`Data: ${fmt(apt.scheduled_at)}`);
      lines.push(`Status atual: ${apt.status}`);
      if (apt.notes) lines.push(`Observações/motivo: ${apt.notes}`);

      if (apt.procedure_id) {
        const { data: proc } = await supabase.from("procedures").select("name, category, description, duration_minutes, default_price").eq("id", apt.procedure_id).maybeSingle();
        if (proc) {
          lines.push(`Procedimento detalhado: ${proc.name}${proc.category ? ` (${proc.category})` : ""}${proc.duration_minutes ? ` · ${proc.duration_minutes}min` : ""}${proc.default_price ? ` · R$ ${proc.default_price}` : ""}`);
          if (proc.description) lines.push(`Descrição: ${proc.description}`);
        }
      }

      const { data: pastAppts } = await supabase.from("appointments").select("id, procedure_name, scheduled_at, status").ilike("patient_name", apt.patient_name).neq("id", apt.id).order("scheduled_at", { ascending: false }).limit(4);
      if (pastAppts?.length) {
        lines.push("\nATENDIMENTOS ANTERIORES DESSE PACIENTE:");
        for (const p of pastAppts) lines.push(`- ${fmt(p.scheduled_at)} · ${p.procedure_name ?? "—"} · ${p.status}`);
        const ids = pastAppts.map((p: any) => p.id);
        const { data: notes } = await supabase.from("clinical_notes").select("appointment_id, note, created_at").in("appointment_id", ids).order("created_at", { ascending: false }).limit(4);
        if (notes?.length) {
          lines.push("\nNOTAS CLÍNICAS RECENTES:");
          for (const n of notes) lines.push(`- [${fmt(n.created_at)}] ${n.note}`);
        }
      }
    }
  }

  if (body.lastMessage) lines.push(`\nÚLTIMA MENSAGEM DO PACIENTE:\n"${body.lastMessage}"`);
  if (body.intent) lines.push(`\nOBJETIVO DA RESPOSTA: ${body.intent}`);
  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!GEMINI_API_KEY) return new Response(JSON.stringify({ error: "GEMINI_API_KEY não configurada" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const body: Body = await req.json();
    const context = await buildContext(supabase, body);

    const systemPrompt = `Você é assistente de atendimento da clínica "GM Estética Avançada" (harmonização facial e estética avançada).
Escreva mensagens de WhatsApp em português brasileiro, tom acolhedor, próximo e profissional, com uso moderado de emojis (💗, ✨, 📅, ⏰).
Use o primeiro nome do paciente. Frases curtas, quebras de linha claras. NUNCA prometa resultados clínicos, NUNCA passe preço sem confirmação, NUNCA use dados que não estejam no contexto.
Sempre termine com uma pergunta ou call-to-action claro (confirmar, escolher horário, tirar dúvida).
Retorne somente JSON válido, sem markdown, neste formato:
{"suggestions":[{"tone":"Direta","message":"..."},{"tone":"Empática","message":"..."},{"tone":"Próxima","message":"..."}]}`;

    const userPrompt = `CONTEXTO DO PACIENTE:\n${context}\n\nGere 3 sugestões de resposta.`;
    const aiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent", {
      method: "POST",
      headers: { "x-goog-api-key": GEMINI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt }] }, contents: [{ role: "user", parts: [{ text: userPrompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 1100, responseMimeType: "application/json" } }),
    });

    if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Limite de uso da IA atingido. Tente novamente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: `Gemini: ${aiRes.status}`, detail: t }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await aiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("").trim();
    let suggestions: { tone: string; message: string }[] = [];
    try {
      const parsed = JSON.parse(text ?? "{}");
      suggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions.filter((item: unknown) => {
        const value = item as { tone?: unknown; message?: unknown };
        return typeof value.tone === "string" && typeof value.message === "string";
      }).slice(0, 3) : [];
    } catch { suggestions = []; }

    if (suggestions.length !== 3) return new Response(JSON.stringify({ error: "A IA não retornou três sugestões válidas. Tente novamente." }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ suggestions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
