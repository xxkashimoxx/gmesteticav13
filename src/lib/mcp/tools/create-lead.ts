import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { anonSupabase } from "../supabase";

export default defineTool({
  name: "create_lead",
  title: "Create lead",
  description:
    "Create a new lead in the clinic CRM. Use for capturing prospects from external channels (ads, referrals, chat).",
  inputSchema: {
    name: z.string().min(1).describe("Lead full name."),
    phone: z.string().optional().describe("Phone number in E.164 or local format."),
    email: z.string().email().optional(),
    source: z.string().optional().describe("Channel origin (e.g. Meta Ads, Google, Indicação)."),
    procedureInterest: z.string().optional().describe("Procedure the lead is interested in."),
    temperature: z.enum(["hot", "warm", "cold"]).optional(),
    notes: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input) => {
    const sb = anonSupabase();
    const { data, error } = await sb
      .from("leads")
      .insert({
        name: input.name,
        phone: input.phone ?? null,
        email: input.email ?? null,
        source: input.source ?? "MCP",
        procedure_interest: input.procedureInterest ?? null,
        temperature: input.temperature ?? "warm",
        stage: "novo",
        notes: input.notes ?? null,
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Lead criado: ${data?.id}` }],
      structuredContent: { lead: data },
    };
  },
});
