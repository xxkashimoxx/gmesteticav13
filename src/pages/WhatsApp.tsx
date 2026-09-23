import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  MessageCircle,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;
const WEBHOOK_URL = 'https://btmbtnsoszsypuvongzq.supabase.co/functions/v1/whatsapp-webhook';

type Message = {
  id: string;
  provider_id: string | null;
  phone: string;
  direction: 'in' | 'out';
  body: string;
  status: string;
  lead_id: string | null;
  sender: string;
  message_type: string;
  created_at: string;
  provider_at: string | null;
  raw_payload: Record<string, any> | null;
  mediaUrl?: string | null;
};

type Contact = {
  id: string;
  wa_id: string;
  phone: string;
  display_name: string | null;
  lead_id: string | null;
};

type WebhookEvent = {
  event_type: string;
  processing_status: string;
  received_at: string;
  processing_error: string | null;
};

type Lead = { id: string; name: string; phone: string | null };

type Thread = {
  key: string;
  phone: string;
  name: string;
  leadId: string | null;
  latest: Message;
  messages: Message[];
};

function phoneKey(value: unknown) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length === 10 || digits.length === 11 ? '55' + digits : digits;
}

function phoneLabel(value: string) {
  const digits = phoneKey(value);
  return digits ? '+' + digits : 'Telefone indisponível';
}

function messageTime(message: Message) {
  const value = message.provider_at || message.created_at;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? message.created_at : date.toISOString();
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    received: 'Recebida',
    sending: 'Enviando',
    accepted: 'Aceita pela Meta',
    sent: 'Enviada',
    delivered: 'Entregue',
    read: 'Lida',
    failed: 'Falhou',
    unknown: 'Sem confirmação',
    processed: 'Processado',
    ignored: 'Arquivado',
  };
  return labels[status] || status;
}

export default function WhatsApp() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [backendReady, setBackendReady] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [metaConnected, setMetaConnected] = useState<boolean | null>(null);
  const [metaPhone, setMetaPhone] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  async function loadDatabase(silent = false) {
    if (!silent) setRefreshing(true);
    const [messageResult, contactResult, eventResult] = await Promise.all([
      db.from('whatsapp_messages')
        .select('id,provider_id,phone,direction,body,status,lead_id,sender,message_type,created_at,provider_at,raw_payload')
        .order('created_at', { ascending: false })
        .limit(500),
      db.from('whatsapp_contacts')
        .select('id,wa_id,phone,display_name,lead_id', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .limit(1000),
      db.from('whatsapp_webhook_events')
        .select('event_type,processing_status,received_at,processing_error')
        .order('received_at', { ascending: false })
        .limit(30),
    ]);

    const error = messageResult.error || contactResult.error || eventResult.error;
    if (error) {
      setBackendReady(false);
      setBackendError(error.message || 'Não foi possível ler as tabelas do WhatsApp.');
      setMessages([]);
      setContacts([]);
      setEvents([]);
      setLeads([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const nextMessages = (messageResult.data ?? []) as Message[];
    const nextContacts = (contactResult.data ?? []) as Contact[];
    const mediaPaths = [...new Set(nextMessages
      .map((message) => String(message.raw_payload?.whatsapp_media?.path ?? '').trim())
      .filter(Boolean))];
    const signedByPath = new Map<string, string>();
    if (mediaPaths.length) {
      const { data: signedFiles, error: signedError } = await supabase.storage
        .from('whatsapp-media')
        .createSignedUrls(mediaPaths, 300);
      if (!signedError) {
        for (const file of signedFiles ?? []) {
          if (file.path && file.signedUrl) signedByPath.set(file.path, file.signedUrl);
        }
      }
    }
    const messagesWithMedia = nextMessages.map((message) => ({
      ...message,
      mediaUrl: signedByPath.get(String(message.raw_payload?.whatsapp_media?.path ?? '')) ?? null,
    }));
    const leadIds = [...new Set(nextMessages.map((message) => message.lead_id).filter(Boolean))] as string[];
    const leadResult = leadIds.length
      ? await db.from('leads').select('id,name,phone').in('id', leadIds)
      : { data: [], error: null };

    if (leadResult.error) {
      setBackendReady(false);
      setBackendError(leadResult.error.message || 'Não foi possível localizar os cadastros dos contatos.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setMessages(messagesWithMedia);
    setContacts(nextContacts);
    setEvents((eventResult.data ?? []) as WebhookEvent[]);
    setLeads((leadResult.data ?? []) as Lead[]);
    setBackendReady(true);
    setBackendError(null);
    setLoading(false);
    setRefreshing(false);
  }

  async function loadMetaStatus() {
    const { data, error } = await supabase.functions.invoke('whatsapp-status', { body: {} });
    if (error || data?.error) {
      setMetaConnected(false);
      setMetaPhone(null);
      return;
    }
    setMetaConnected(Boolean(data?.connected));
    setMetaPhone(data?.phone ?? null);
  }

  useEffect(() => {
    void loadDatabase();
    void loadMetaStatus();
    const timer = window.setInterval(() => void loadDatabase(true), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const threads = useMemo(() => {
    const leadById = new Map(leads.map((lead) => [lead.id, lead]));
    const contactByPhone = new Map(contacts.map((contact) => [phoneKey(contact.phone || contact.wa_id), contact]));
    const grouped = new Map<string, Thread>();

    for (const message of messages) {
      const key = phoneKey(message.phone);
      if (!key) continue;
      const contact = contactByPhone.get(key);
      const lead = message.lead_id ? leadById.get(message.lead_id) : null;
      const thread = grouped.get(key);
      if (thread) {
        thread.messages.push(message);
        if (!thread.leadId && message.lead_id) thread.leadId = message.lead_id;
      } else {
        grouped.set(key, {
          key,
          phone: message.phone,
          name: contact?.display_name || lead?.name || phoneLabel(message.phone),
          leadId: message.lead_id || contact?.lead_id || null,
          latest: message,
          messages: [message],
        });
      }
    }

    return [...grouped.values()].map((thread) => ({
      ...thread,
      messages: [...thread.messages].sort((a, b) =>
        new Date(messageTime(a)).getTime() - new Date(messageTime(b)).getTime(),
      ),
    })).sort((a, b) =>
      new Date(messageTime(b.latest)).getTime() - new Date(messageTime(a.latest)).getTime(),
    );
  }, [messages, contacts, leads]);

  useEffect(() => {
    if (!selected && threads.length) setSelected(threads[0].key);
  }, [threads, selected]);

  const active = threads.find((thread) => thread.key === selected) ?? null;
  const failures = events.filter((event) => event.processing_status === 'failed').length;
  const latestEvent = events[0] ?? null;

  async function sendManual() {
    if (!active || !active.leadId || !draft.trim()) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke('whatsapp-send', {
      body: {
        requestId: crypto.randomUUID(),
        leadId: active.leadId,
        message: draft.trim(),
      },
    });
    setSending(false);
    if (error || data?.error) {
      toast.error('Não foi possível enviar', { description: data?.error || error?.message });
      return;
    }
    setDraft('');
    toast.success('Mensagem encaminhada para a Meta.');
    await loadDatabase(true);
  }

  async function copyWebhook() {
    try {
      await navigator.clipboard.writeText(WEBHOOK_URL);
      toast.success('Endereço do webhook copiado.');
    } catch {
      toast.error('Não foi possível copiar o endereço.');
    }
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
            <MessageCircle className="h-7 w-7 text-[#25D366]" />
            WhatsApp Business
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mensagens, contatos sincronizados e eventos recebidos da Meta.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            void loadDatabase();
            void loadMetaStatus();
          }}
          disabled={refreshing}
        >
          {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Atualizar
        </Button>
      </div>

      {backendError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex gap-3 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="font-semibold">Não foi possível carregar os dados do WhatsApp</p>
              <p className="break-all text-sm text-muted-foreground">{backendError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Webhook e banco</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Persistência</span>
            <Badge variant={backendReady ? 'default' : 'secondary'}>
              {loading ? 'Verificando' : backendReady ? 'Pronto' : 'Indisponível'}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">API da Meta</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between gap-2">
            <span className="truncate text-sm text-muted-foreground">{metaPhone || 'Conexão API'}</span>
            <Badge variant={metaConnected ? 'default' : 'secondary'}>
              {metaConnected === null ? 'Verificando' : metaConnected ? 'Conectada' : 'Pendente'}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Contatos sincronizados</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" />WhatsApp Business</span>
            <span className="font-semibold">{contacts.length}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Eventos com erro</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="h-4 w-4" />Últimos 30</span>
            <Badge variant={failures ? 'destructive' : 'secondary'}>{failures}</Badge>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex gap-3 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="font-semibold text-sm">Respostas automáticas do sistema desligadas</p>
            <p className="text-sm text-muted-foreground">
              Você pode usar a Meta AI no WhatsApp Business do celular. O sistema registra os eventos recebidos e não responde clientes automaticamente.
            </p>
          </div>
        </CardContent>
      </Card>

      {!loading && events.length === 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex gap-3 p-4">
            <Clock3 className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-sm">Ainda não chegou nenhum evento da Meta</p>
              <p className="text-sm text-muted-foreground">
                Depois de concluir a integração de coexistência, confirme a inscrição dos campos messages, smb_message_echoes, history e smb_app_state_sync na Meta.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {latestEvent && (
        <Card>
          <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-semibold text-sm">Último evento: {latestEvent.event_type}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(latestEvent.received_at).toLocaleString('pt-BR')} · {statusLabel(latestEvent.processing_status)}
              </p>
              {latestEvent.processing_error && (
                <p className="mt-1 break-words text-xs text-destructive">{latestEvent.processing_error}</p>
              )}
            </div>
            <Badge variant={latestEvent.processing_status === 'failed' ? 'destructive' : 'secondary'}>
              {statusLabel(latestEvent.processing_status)}
            </Badge>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 gap-3">
            <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="font-semibold text-sm">Webhook oficial da Meta</p>
              <p className="break-all text-xs text-muted-foreground">{WEBHOOK_URL}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={copyWebhook}>
            <Copy className="mr-2 h-4 w-4" />Copiar endereço
          </Button>
        </CardContent>
      </Card>

      <div className="grid min-h-[560px] grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Conversas
              <Badge variant="secondary">{threads.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[650px] space-y-1 overflow-y-auto p-2">
            {threads.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {loading ? 'Carregando conversas…' : 'As conversas recebidas aparecerão aqui.'}
              </p>
            )}
            {threads.map((thread) => (
              <button
                key={thread.key}
                onClick={() => setSelected(thread.key)}
                className={'w-full rounded-lg border p-3 text-left ' + (selected === thread.key ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/60')}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{thread.name}</p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {new Date(messageTime(thread.latest)).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">{thread.latest.body || '[Mensagem sem texto]'}</p>
                <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Phone className="h-3 w-3" />{phoneLabel(thread.phone)}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="border-b">
            <CardTitle className="text-base">
              {active ? active.name : 'Selecione uma conversa'}
              {active && <span className="ml-2 text-sm font-normal text-muted-foreground">{phoneLabel(active.phone)}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col p-4">
            <div className="min-h-[320px] flex-1 space-y-3 overflow-y-auto">
              {active?.messages.map((message) => {
                const media = message.raw_payload?.whatsapp_media;
                const mime = String(media?.mime_type ?? '').toLowerCase();
                return (
                <div key={message.id} className={'flex ' + (message.direction === 'out' ? 'justify-end' : 'justify-start')}>
                  <div className={'max-w-[82%] rounded-xl px-3 py-2 text-sm ' + (message.direction === 'out' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                    <p className="whitespace-pre-wrap break-words">{message.body || '[Mensagem sem texto]'}</p>
                    {message.mediaUrl && mime.startsWith('image/') && (
                      <a href={message.mediaUrl} target="_blank" rel="noreferrer">
                        <img src={message.mediaUrl} alt={String(media?.filename ?? 'Anexo do WhatsApp')} className="mt-2 max-h-80 rounded-lg object-contain" />
                      </a>
                    )}
                    {message.mediaUrl && mime.startsWith('audio/') && (
                      <audio className="mt-2 max-w-full" controls preload="none" src={message.mediaUrl}>Áudio do WhatsApp</audio>
                    )}
                    {message.mediaUrl && mime.startsWith('video/') && (
                      <video className="mt-2 max-h-80 max-w-full rounded-lg" controls preload="metadata" src={message.mediaUrl}>Vídeo do WhatsApp</video>
                    )}
                    {message.mediaUrl && !mime.startsWith('image/') && !mime.startsWith('audio/') && !mime.startsWith('video/') && (
                      <a className="mt-2 block underline" href={message.mediaUrl} target="_blank" rel="noreferrer">
                        Abrir anexo{media?.filename ? ': ' + String(media.filename) : ''}
                      </a>
                    )}
                    {media?.status === 'too_large' && (
                      <p className="mt-2 text-xs opacity-80">Arquivo maior que 50 MB: os metadados foram salvos, mas o arquivo não foi arquivado.</p>
                    )}
                    <p className="mt-1 text-[10px] opacity-75">
                      {message.direction === 'out' ? 'Enviada' : 'Recebida'}{message.message_type !== 'text' ? ' · ' + message.message_type : ''}
                      {' · '}{statusLabel(message.status)}
                      {' · '}{new Date(messageTime(message)).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                );
              })}
              {!active && <p className="py-12 text-center text-sm text-muted-foreground">Selecione uma conversa para ver as mensagens.</p>}
            </div>

            {active && (
              <div className="mt-4 space-y-2 border-t pt-4">
                {!active.leadId && (
                  <p className="text-xs text-muted-foreground">Esta conversa ainda não está vinculada a um cadastro que permita envio pelo sistema.</p>
                )}
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Responder manualmente pelo sistema…"
                  rows={2}
                  disabled={!active.leadId || sending}
                />
                <div className="flex justify-end">
                  <Button onClick={sendManual} disabled={!active.leadId || sending || !draft.trim()}>
                    {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {sending ? 'Enviando…' : 'Enviar'}
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
