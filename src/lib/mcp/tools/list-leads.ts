import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { anonSupabase } from "../supabase";

export default defineTool({
  name: "list_leads",
  title: "List leads",
  description:
    "List leads in the clinic CRM, optionally filtered by temperature (hot/warm/cold) or stage.",
  inputSchema: {
    temperature: z.enum(["hot", "warm", "cold"]).optional(),
    stage: z
      .enum(["novo", "contato", "qualificado", "agendamento", "convertido", "perdido"])
      .optional(),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows. Default 50."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ temperature, stage, limit }) => {
    const sb = anonSupabase();
    let q = sb
      .from("leads")
      .select(
        "id,name,phone,email,source,campaign,procedure_interest,temperature,stage,score,estimated_value,last_contact_at,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (temperature) q = q.eq("temperature", temperature);
    if (stage) q = q.eq("stage", stage);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { leads: data ?? [] },
    };
  },
});
