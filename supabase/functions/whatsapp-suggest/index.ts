// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface Body {
  leadId?: string;
  appointmentId?: string;
  intent?: string; // e.g. "confirmar horário", "reengajar", "responder objeção de preço"
  lastMessage?: string; // última mensagem recebida do paciente (opcional)
}

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("pt-BR");
  } catch {
    return d;
  }
}

async function buildContext(supabase: any, body: Body): Promise<string> {
  const lines: string[] = [];

  if (body.leadId) {
    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", body.leadId)
      .maybeSingle();
    if (lead) {
      lines.push(`PACIENTE/LEAD: ${lead.name}`);
      lines.push(
        `Origem: ${lead.source}${lead.campaign ? " · " + lead.campaign : ""}`,
      );
      lines.push(
        `Etapa: ${lead.stage} · Temperatura: ${lead.temperature} · Score: ${lead.score}`,
      );
      if (lead.procedure_interest)
        lines.push(`Interesse: ${lead.procedure_interest}`);
      if (lead.estimated_value)
        lines.push(`Ticket estimado: R$ ${lead.estimated_value}`);
      if (lead.notes) lines.push(`Notas: ${lead.notes}`);
      lines.push(`Último contato: ${fmt(lead.last_contact_at)}`);

      const { data: interactions } = await supabase
        .from("lead_interactions")
        .select("channel, direction, message, created_at")
        .eq("lead_id", body.leadId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (interactions?.length) {
        lines.push("\nHISTÓRICO DE INTERAÇÕES (mais recente primeiro):");
        for (const i of interactions) {
          const dir =
            i.direction === "in"
              ? "← Recebida"
              : i.direction === "out"
                ? "→ Enviada"
                : "· Nota";
          lines.push(`- [${fmt(i.created_at)}] ${dir} (${i.channel}): ${i.message}`);
        }
      }

      const { data: appts } = await supabase
        .from("appointments")
        .select("procedure_name, scheduled_at, status, value")
        .ilike("patient_name", lead.name)
        .order("scheduled_at", { ascending: false })
        .limit(5);
      if (appts?.length) {
        lines.push("\nATENDIMENTOS:");
        for (const a of appts) {
          lines.push(
            `- ${fmt(a.scheduled_at)} · ${a.procedure_name ?? "—"} · ${a.status} · R$ ${a.value ?? 0}`,
          );
        }
      }
    }
  }

  if (body.appointmentId) {
    const { data: apt } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", body.appointmentId)
      .maybeSingle();
    if (apt) {
      lines.push(`\nAGENDAMENTO EM FOCO:`);
      lines.push(`Paciente: ${apt.patient_name}`);
      lines.push(`Procedimento: ${apt.procedure_name ?? "—"}`);
      lines.push(`Data: ${fmt(apt.scheduled_at)}`);
      lines.push(`Status: ${apt.status}`);
      if (apt.notes) lines.push(`Obs: ${apt.notes}`);
    }
  }

  if (body.lastMessage) {
    lines.push(`\nÚLTIMA MENSAGEM DO PACIENTE:\n"${body.lastMessage}"`);
  }
  if (body.intent) lines.push(`\nOBJETIVO DA RESPOSTA: ${body.intent}`);

  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const body: Body = await req.json();
    const context = await buildContext(supabase, body);

    const systemPrompt = `Você é assistente de atendimento da clínica "GM Estética Avançada" (harmonização facial e estética avançada).
Escreva mensagens de WhatsApp em português brasileiro, tom acolhedor, próximo e profissional, com uso moderado de emojis (💗, ✨, 📅, ⏰).
Use o primeiro nome do paciente. Frases curtas, quebras de linha claras. NUNCA prometa resultados clínicos, NUNCA passe preço sem confirmação, NUNCA use dados que não estejam no contexto.
Sempre termine com uma pergunta ou call-to-action claro (confirmar, escolher horário, tirar dúvida).
Retorne EXATAMENTE 3 sugestões diferentes entre si em tom/abordagem (ex: direta, empática, com prova social).`;

    const userPrompt = `CONTEXTO DO PACIENTE:\n${context}\n\nGere 3 sugestões de resposta.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_suggestions",
              description: "Retorna 3 sugestões de mensagem de WhatsApp",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    minItems: 3,
                    maxItems: 3,
                    items: {
                      type: "object",
                      properties: {
                        tone: {
                          type: "string",
                          description: "Rótulo curto do tom (ex: 'Direta', 'Empática', 'Com prova social')",
                        },
                        message: { type: "string", description: "Texto pronto pra colar no WhatsApp" },
                      },
                      required: ["tone", "message"],
                    },
                  },
                },
                required: ["suggestions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_suggestions" } },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(
        JSON.stringify({ error: "Limite de uso da IA atingido. Tente novamente em instantes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (aiRes.status === 402) {
      return new Response(
        JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(
        JSON.stringify({ error: `AI gateway error: ${aiRes.status}`, detail: t }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await aiRes.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    let suggestions: { tone: string; message: string }[] = [];
    if (call?.function?.arguments) {
      try {
        suggestions = JSON.parse(call.function.arguments).suggestions ?? [];
      } catch {
        suggestions = [];
      }
    }
    if (!suggestions.length) {
      const text = data?.choices?.[0]?.message?.content ?? "";
      suggestions = [{ tone: "Sugestão", message: text }];
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
