import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { anonSupabase } from "../supabase";

export default defineTool({
  name: "list_upcoming_appointments",
  title: "List upcoming appointments",
  description:
    "List scheduled appointments starting from now, ordered by date. Returns patient name, procedure, scheduled time, status and value.",
  inputSchema: {
    days: z
      .number()
      .int()
      .min(1)
      .max(90)
      .optional()
      .describe("Look-ahead window in days. Default 14."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows. Default 50."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days, limit }) => {
    const sb = anonSupabase();
    const now = new Date();
    const until = new Date(now.getTime() + (days ?? 14) * 86400_000);
    const { data, error } = await sb
      .from("appointments")
      .select("id,patient_name,procedure_name,scheduled_at,status,confirmation_status,value")
      .gte("scheduled_at", now.toISOString())
      .lte("scheduled_at", until.toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(limit ?? 50);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { appointments: data ?? [] },
    };
  },
});
