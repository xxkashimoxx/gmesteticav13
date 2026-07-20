import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { anonSupabase } from "../supabase";

export default defineTool({
  name: "list_procedures",
  title: "List procedures",
  description:
    "List aesthetic procedures offered by the clinic (name, category, default price, description).",
  inputSchema: {
    includeArchived: z
      .boolean()
      .optional()
      .describe("Include archived procedures. Defaults to false."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows. Default 100."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ includeArchived, limit }) => {
    const sb = anonSupabase();
    let q = sb
      .from("procedures")
      .select("id,name,category,default_price,description,duration,sessions_recommended,archived")
      .order("name", { ascending: true })
      .limit(limit ?? 100);
    if (!includeArchived) q = q.eq("archived", false);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { procedures: data ?? [] },
    };
  },
});
