// Anon-only Supabase client for the public MCP server.
// Never import SUPABASE_SERVICE_ROLE_KEY here — this endpoint is unauthenticated.
import { createClient } from "@supabase/supabase-js";

export function anonSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
