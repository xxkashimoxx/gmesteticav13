const ALLOWED_ORIGIN = "https://landing-page-gm-two.vercel.app";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (origin !== ALLOWED_ORIGIN) return new Response(null, { status: 403 });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return new Response(null, { status: 405, headers: corsHeaders });

  const length = Number(req.headers.get("content-length") ?? "0");
  if (length > 2048) return new Response(null, { status: 413, headers: corsHeaders });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400, headers: corsHeaders });
  }

  const allowedTypes = new Set(["page_view", "booking_request", "cta_click", "whatsapp_click"]);
  const eventType = body.event_type;
  const pagePath = body.page_path;
  const ctaName = body.cta_name;
  if (
    typeof eventType !== "string" || !allowedTypes.has(eventType) ||
    typeof pagePath !== "string" || !/^\/[A-Za-z0-9/_-]{0,199}$/.test(pagePath) ||
    (ctaName !== undefined && (typeof ctaName !== "string" || !/^[A-Za-z0-9 _-]{1,64}$/.test(ctaName)))
  ) return new Response(null, { status: 400, headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return new Response(null, { status: 500, headers: corsHeaders });

  const response = await fetch(`${supabaseUrl}/rest/v1/landing_page_events`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ event_type: eventType, page_path: pagePath, cta_name: ctaName ?? null }),
  });
  return new Response(null, { status: response.ok ? 204 : 502, headers: corsHeaders });
});
