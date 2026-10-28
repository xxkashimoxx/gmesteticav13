// Retired endpoint: responses are managed by the native WhatsApp Business AI.
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  return new Response(JSON.stringify({ error: 'Recurso removido. Gerencie a IA em Ferramentas → IA no WhatsApp Business.' }), { status: 410, headers });
});
