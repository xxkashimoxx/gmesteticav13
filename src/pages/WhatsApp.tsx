import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, ShieldCheck, Bot, UserRound, Copy, RefreshCw, Send, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;
const WEBHOOK_URL = 'https://ktnwehlysguwtjyshqtc.supabase.co/functions/v1/whatsapp-webhook';

type Conversation = {
  id: string;
  status: 'open' | 'human' | 'closed';
  ai_enabled: boolean;
  last_message_at: string | null;
  whatsapp_contacts?: { wa_id?: string; display_name?: string | null } | null;
};

type Message = {
  id: string;
  sender: 'client' | 'ai' | 'human' | 'system';
  body: string | null;
  status: string | null;
  created_at: string;
};

export default function WhatsApp() {
  const [loading, setLoading] = useState(true);
  const [backendReady, setBackendReady] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true);
    const [settingsRes, conversationsRes] = await Promise.all([
      db.from('whatsapp_settings').select('*').eq('id', 1).maybeSingle(),
      db
        .from('whatsapp_conversations')
        .select('id,status,ai_enabled,last_message_at,whatsapp_contacts!inner(wa_id,display_name)')
        .order('last_message_at', { ascending: false }),
    ]);

    if (settingsRes.error || conversationsRes.error) {
      setBackendReady(false);
      setSettings(null);
      setConversations([]);
      setLoading(false);
      return;
    }

    setBackendReady(true);
    setSettings(settingsRes.data);
    setConversations((conversationsRes.data ?? []) as Conversation[]);
    if (!selected && conversationsRes.data?.[0]?.id) setSelected(conversationsRes.data[0].id);
    setLoading(false);
  }

  async function loadMessages(conversationId: string) {
    const { data, error } = await db
      .from('whatsapp_messages')
      .select('id,sender,body,status,created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(200);
    if (error) return;
    setMessages((data ?? []) as Message[]);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { if (selected) loadMessages(selected); else setMessages([]); }, [selected]);

  const active = useMemo(() => conversations.find((c) => c.id === selected) ?? null, [conversations, selected]);
  const connected = Boolean(settings?.phone_number_id || import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID);

  async function toggleGlobal(value: boolean) {
    const { error } = await db
      .from('whatsapp_settings')
      .update({ auto_reply_enabled: value, updated_at: new Date().toISOString() })
      .eq('id', 1);
    if (error) return toast.error('Não foi possível alterar', { description: error.message });
    setSettings((s: any) => ({ ...s, auto_reply_enabled: value }));
    toast.success(value ? 'Resposta automática ligada' : 'Resposta automática desligada');
  }

  async function setConversationMode(mode: 'human' | 'ai') {
    if (!active) return;
    const patch = mode === 'human'
      ? { status: 'human', ai_enabled: false, updated_at: new Date().toISOString() }
      : { status: 'open', ai_enabled: true, updated_at: new Date().toISOString() };
    const { error } = await db.from('whatsapp_conversations').update(patch).eq('id', active.id);
    if (error) return toast.error('Não foi possível alterar a conversa', { description: error.message });
    await load();
  }

  async function sendManual() {
    if (!active || !draft.trim()) return;
    setSending(true);
    const { error } = await supabase.functions.invoke('whatsapp-send', {
      body: { conversationId: active.id, message: draft.trim() },
    });
    setSending(false);
    if (error) return toast.error('Falha ao enviar', { description: error.message });
    setDraft('');
    await Promise.all([load(), loadMessages(active.id)]);
  }

  async function copyWebhook() {
    await navigator.clipboard.writeText(WEBHOOK_URL);
    toast.success('Webhook copiado');
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <MessageCircle className="w-7 h-7 text-[#25D366]" /> WhatsApp
          </h1>
          <p className="text-sm text-muted-foreground">Central oficial de conversas, IA e atendimento humano.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
        </Button>
      </div>

      {!backendReady && !loading && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Base do WhatsApp ainda não aplicada no Supabase</p>
              <p className="text-sm text-muted-foreground">
                O código já está preparado no repositório. Falta aplicar a migration e publicar as Edge Functions no projeto Supabase atual.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Backend</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Banco + funções</span>
            <Badge variant={backendReady ? 'default' : 'secondary'}>{backendReady ? 'Pronto' : 'Pendente'}</Badge>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Meta WhatsApp</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Número oficial/API</span>
            <Badge variant={connected ? 'default' : 'secondary'}>{connected ? 'Configurado' : 'Pendente'}</Badge>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">IA automática</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Responder clientes</span>
            <Switch
              checked={Boolean(settings?.auto_reply_enabled)}
              disabled={!backendReady || !connected}
              onCheckedChange={toggleGlobal}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card border-0 bg-gradient-card">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex gap-3">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Webhook oficial da Meta</p>
              <p className="text-xs text-muted-foreground break-all">{WEBHOOK_URL}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={copyWebhook}>
            <Copy className="w-4 h-4 mr-2" /> Copiar
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 min-h-[520px]">
        <Card className="shadow-card border-0 bg-gradient-card overflow-hidden">
          <CardHeader className="pb-3"><CardTitle className="text-base">Conversas</CardTitle></CardHeader>
          <CardContent className="p-2 pt-0 space-y-1 max-h-[620px] overflow-y-auto">
            {conversations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">Nenhuma conversa recebida ainda.</p>
            )}
            {conversations.map((c) => {
              const contact = c.whatsapp_contacts;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={`w-full text-left p-3 rounded-lg border transition ${selected === c.id ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/60'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate">{contact?.display_name || contact?.wa_id || 'Contato'}</p>
                    <Badge variant="secondary" className="text-[10px]">{c.status === 'human' ? 'Humano' : c.ai_enabled ? 'IA' : 'Aberto'}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{c.last_message_at ? new Date(c.last_message_at).toLocaleString('pt-BR') : '—'}</p>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="shadow-card border-0 bg-gradient-card flex flex-col overflow-hidden">
          <CardHeader className="border-b">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base">{active?.whatsapp_contacts?.display_name || active?.whatsapp_contacts?.wa_id || 'Selecione uma conversa'}</CardTitle>
                {active && <p className="text-xs text-muted-foreground mt-1">{active.whatsapp_contacts?.wa_id}</p>}
              </div>
              {active && (
                <div className="flex gap-2">
                  <Button size="sm" variant={active.status === 'human' ? 'default' : 'outline'} onClick={() => setConversationMode('human')}>
                    <UserRound className="w-4 h-4 mr-1" /> Assumir
                  </Button>
                  <Button size="sm" variant={active.status !== 'human' && active.ai_enabled ? 'default' : 'outline'} onClick={() => setConversationMode('ai')}>
                    <Bot className="w-4 h-4 mr-1" /> Devolver à IA
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-4 flex-1 flex flex-col min-h-0">
            <div className="flex-1 space-y-3 overflow-y-auto pr-1 min-h-[300px]">
              {!active && <p className="text-sm text-muted-foreground text-center py-16">Escolha uma conversa ao lado.</p>}
              {active && messages.map((m) => {
                const mine = m.sender !== 'client';
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[82%] rounded-xl px-3 py-2 text-sm ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className={`text-[10px] mt-1 ${mine ? 'opacity-75' : 'text-muted-foreground'}`}>
                        {m.sender} · {new Date(m.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {active && (
              <div className="pt-4 border-t mt-4 space-y-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Responder manualmente..."
                  rows={2}
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">Ao responder manualmente, esta conversa passa para atendimento humano.</p>
                  <Button onClick={sendManual} disabled={sending || !draft.trim()}>
                    <Send className="w-4 h-4 mr-2" /> {sending ? 'Enviando...' : 'Enviar'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
