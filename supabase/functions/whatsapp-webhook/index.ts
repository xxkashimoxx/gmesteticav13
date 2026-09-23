import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') ?? Deno.env.get('META_VERIFY_TOKEN') ?? '';
const APP_SECRET = Deno.env.get('WHATSAPP_APP_SECRET') ?? Deno.env.get('META_APP_SECRET') ?? '';
const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? '';
const ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN') ?? '';
const API_VERSION = Deno.env.get('WHATSAPP_API_VERSION') ?? 'v23.0';
const MEDIA_BUCKET = 'whatsapp-media';
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const MAX_MEDIA_BYTES = 50 * 1024 * 1024;

const db = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(value: string) {
  return bytesToHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

async function validMetaSignature(raw: string, signature: string | null) {
  if (!APP_SECRET || !/^sha256=[a-f0-9]{64}$/i.test(signature ?? '')) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(APP_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const digest = Uint8Array.from(signature!.slice(7).match(/../g)!, (part) => parseInt(part, 16));
  return crypto.subtle.verify('HMAC', key, digest, new TextEncoder().encode(raw));
}

function normalizePhone(raw: unknown): string | null {
  const digits = String(raw ?? '').replace(/\D/g, '');
  const phone = digits.length === 10 || digits.length === 11 ? '55' + digits : digits;
  return /^[1-9]\d{9,14}$/.test(phone) ? phone : null;
}

function toIso(raw: unknown) {
  if (raw === null || raw === undefined || raw === '') return new Date().toISOString();
  const numeric = typeof raw === 'number' ? raw : Number(String(raw));
  const date = Number.isFinite(numeric) && numeric > 0
    ? new Date(numeric < 1e12 ? numeric * 1000 : numeric)
    : new Date(String(raw));
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function bodyFromMessage(message: any): string {
  const type = String(message?.type ?? 'unknown').toLowerCase();
  if (type === 'text') return String(message?.text?.body ?? '');
  if (type === 'button') return String(message?.button?.text ?? '');
  if (type === 'interactive') {
    return String(message?.interactive?.button_reply?.title ?? message?.interactive?.list_reply?.title ?? '');
  }
  if (type === 'image') return String(message?.image?.caption ?? '[Imagem recebida]');
  if (type === 'video') return String(message?.video?.caption ?? '[Vídeo recebido]');
  if (type === 'audio' || type === 'voice') return '[Áudio recebido]';
  if (type === 'document') {
    const filename = String(message?.document?.filename ?? '');
    return filename ? '[Documento recebido: ' + filename + ']' : '[Documento recebido]';
  }
  if (type === 'sticker') return '[Figurinha recebida]';
  if (type === 'location') {
    const label = [message?.location?.name, message?.location?.address].filter(Boolean).join(' — ');
    return label || '[Localização recebida]';
  }
  if (type === 'contacts') return '[Contato compartilhado]';
  if (type === 'reaction') return String(message?.reaction?.emoji ?? '[Reação]');
  if (type === 'edit') return String(message?.edit?.text?.body ?? message?.text?.body ?? '[Mensagem editada]');
  if (type === 'revoke' || type === 'delete') return '[Mensagem apagada no WhatsApp]';
  return '[Mensagem do tipo ' + type + ']';
}

const MEDIA_TYPES = new Set(['image', 'video', 'audio', 'voice', 'document', 'sticker']);

function mediaExtension(mimeType: string) {
  const mime = mimeType.toLowerCase().split(';')[0].trim();
  const known: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'audio/ogg': 'ogg',
    'audio/opus': 'opus',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  };
  return known[mime] ?? 'bin';
}

async function archiveMedia(message: any, providerId: string) {
  const type = String(message?.type ?? '').toLowerCase();
  if (!MEDIA_TYPES.has(type)) return message;

  const media = message?.[type] ?? (type === 'voice' ? message?.audio : null);
  const mediaId = String(media?.id ?? '').trim();
  const base = { ...message };
  if (!mediaId) {
    base.whatsapp_media = { status: 'metadata_only', reason: 'media_id_missing' };
    return base;
  }

  const declaredSize = Number(media?.file_size ?? 0);
  if (declaredSize > MAX_MEDIA_BYTES) {
    base.whatsapp_media = {
      status: 'too_large',
      media_id: mediaId,
      mime_type: media?.mime_type ?? null,
      size_bytes: declaredSize,
      max_bytes: MAX_MEDIA_BYTES,
      filename: media?.filename ?? null,
    };
    return base;
  }
  if (!ACCESS_TOKEN) throw new Error('WHATSAPP_ACCESS_TOKEN não está configurado para baixar anexos.');

  const metadataResponse = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${encodeURIComponent(mediaId)}`,
    { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }, signal: AbortSignal.timeout(20000) },
  );
  const metadata = await metadataResponse.json().catch(() => ({}));
  if (!metadataResponse.ok || typeof metadata?.url !== 'string') {
    throw new Error('A Meta não disponibilizou a URL temporária da mídia.');
  }

  const mediaUrl = new URL(metadata.url);
  if (mediaUrl.protocol !== 'https:') throw new Error('A Meta retornou uma URL de mídia insegura.');

  const fileResponse = await fetch(mediaUrl, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    signal: AbortSignal.timeout(30000),
  });
  if (!fileResponse.ok) throw new Error('Não foi possível baixar a mídia da Meta.');
  const responseSize = Number(fileResponse.headers.get('content-length') ?? 0);
  if (responseSize > MAX_MEDIA_BYTES) {
    base.whatsapp_media = {
      status: 'too_large',
      media_id: mediaId,
      mime_type: metadata?.mime_type ?? media?.mime_type ?? null,
      size_bytes: responseSize,
      max_bytes: MAX_MEDIA_BYTES,
      filename: media?.filename ?? null,
    };
    return base;
  }

  const bytes = new Uint8Array(await fileResponse.arrayBuffer());
  if (bytes.byteLength > MAX_MEDIA_BYTES) {
    base.whatsapp_media = {
      status: 'too_large',
      media_id: mediaId,
      mime_type: metadata?.mime_type ?? media?.mime_type ?? null,
      size_bytes: bytes.byteLength,
      max_bytes: MAX_MEDIA_BYTES,
      filename: media?.filename ?? null,
    };
    return base;
  }

  const mimeType = String(metadata?.mime_type ?? media?.mime_type ?? fileResponse.headers.get('content-type') ?? 'application/octet-stream');
  const objectPath = `media/${await sha256(mediaId)}.${mediaExtension(mimeType)}`;
  const { error } = await db!.storage.from(MEDIA_BUCKET).upload(objectPath, bytes, {
    contentType: mimeType,
    cacheControl: '31536000',
    upsert: true,
  });
  if (error) throw new Error('Não foi possível guardar a mídia no armazenamento privado.');

  base.whatsapp_media = {
    status: 'stored',
    bucket: MEDIA_BUCKET,
    path: objectPath,
    media_id: mediaId,
    mime_type: mimeType,
    size_bytes: bytes.byteLength,
    filename: media?.filename ?? null,
    caption: media?.caption ?? null,
  };
  return base;
}

async function saveMessage(args: {
  id: unknown;
  phone: unknown;
  name?: unknown;
  direction: 'in' | 'out';
  type?: unknown;
  body?: string;
  raw: unknown;
  timestamp?: unknown;
}) {
  const id = String(args.id ?? '').trim();
  const phone = normalizePhone(args.phone);
  if (!id || !phone) return;
  const name = String(args.name ?? '').trim().slice(0, 160) || null;
  const type = String(args.type ?? 'unknown').slice(0, 80);
  const body = String(args.body ?? bodyFromMessage(args.raw)).slice(0, 4096) || '[Mensagem WhatsApp]';
  const raw = args.raw && typeof args.raw === 'object' && !Array.isArray(args.raw)
    ? await archiveMedia(args.raw, id)
    : args.raw;
  const { error } = await db!.rpc('gm_whatsapp_ingest_message', {
    p_provider_id: id,
    p_phone: phone,
    p_name: name,
    p_direction: args.direction,
    p_body: body,
    p_status: args.direction === 'in' ? 'received' : 'sent',
    p_message_type: type,
    p_raw_payload: raw,
    p_at: toIso(args.timestamp),
  });
  if (error) throw new Error('Não foi possível salvar a mensagem WhatsApp.');
}

async function saveContacts(value: any) {
  const contacts = Array.isArray(value?.contacts) ? value.contacts : [];
  for (const item of contacts) {
    const phone = normalizePhone(item?.wa_id ?? item?.input);
    if (!phone) continue;
    const name = item?.profile?.name ?? item?.name ?? null;
    const { error } = await db!.rpc('gm_whatsapp_ingest_contact', {
      p_phone: phone,
      p_name: name,
      p_raw_payload: item,
      p_at: new Date().toISOString(),
    });
    if (error) throw new Error('Não foi possível salvar um contato WhatsApp.');
  }
}

async function saveStatuses(value: any) {
  for (const status of Array.isArray(value?.statuses) ? value.statuses : []) {
    const providerId = String(status?.id ?? '').trim();
    const state = String(status?.status ?? '');
    if (!providerId || !['accepted', 'sent', 'delivered', 'read', 'failed'].includes(state)) continue;
    const errorCode = status?.errors?.[0]?.code == null ? null : String(status.errors[0].code);
    const requestId = /^[0-9a-f-]{36}$/i.test(String(status?.biz_opaque_callback_data ?? ''))
      ? String(status.biz_opaque_callback_data)
      : null;
    const { error } = await db!.rpc('gm_whatsapp_status', {
      p_provider_id: providerId,
      p_status: state,
      p_at: toIso(status?.timestamp),
      p_error: errorCode,
      p_request_id: requestId,
    });
    if (error) throw new Error('Não foi possível atualizar o status da mensagem WhatsApp.');
  }
}

async function handleInbound(value: any) {
  await saveContacts(value);
  for (const message of Array.isArray(value?.messages) ? value.messages : []) {
    const waId = String(message?.from ?? '');
    const contact = (Array.isArray(value?.contacts) ? value.contacts : [])
      .find((candidate: any) => String(candidate?.wa_id ?? '') === waId);
    await saveMessage({
      id: message?.id,
      phone: waId,
      name: contact?.profile?.name,
      direction: 'in',
      type: message?.type,
      raw: message,
      timestamp: message?.timestamp,
    });
  }
  await saveStatuses(value);
}

async function handleEchoes(value: any) {
  for (const message of Array.isArray(value?.message_echoes) ? value.message_echoes : []) {
    const type = String(message?.type ?? 'unknown');
    const id = String(message?.id ?? '');
    const eventId = ['edit', 'revoke', 'delete'].includes(type.toLowerCase())
      ? id + ':' + type.toLowerCase() + ':' + String(message?.timestamp ?? 'unknown')
      : id;
    await saveMessage({
      id: eventId,
      phone: message?.to,
      name: message?.contact?.name,
      direction: 'out',
      type: message?.type,
      raw: message,
      timestamp: message?.timestamp,
    });
  }
}

function isMessageLike(value: any) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && value.id != null && value.type != null
    && (value.from != null || value.to != null || value.from_me != null || value.is_from_me != null || value.timestamp != null);
}

async function handleHistory(value: any) {
  const metadata = value?.metadata ?? {};
  const businessPhone = normalizePhone(metadata?.display_phone_number);
  const seen = new Set<string>();

  const visit = async (node: any, inheritedPhone: unknown, inheritedName: unknown, depth: number): Promise<void> => {
    if (depth > 16 || node == null) return;
    if (Array.isArray(node)) {
      for (const child of node) await visit(child, inheritedPhone, inheritedName, depth + 1);
      return;
    }
    if (typeof node !== 'object') return;

    const contact = node.contact ?? node.customer ?? node.profile ?? {};
    const contextPhone = contact?.phone_number ?? contact?.wa_id ?? node.wa_id ?? node.phone_number ?? node.phone ?? inheritedPhone;
    const contextName = contact?.full_name ?? contact?.name ?? contact?.first_name ?? node.contact_name ?? inheritedName;

    if (isMessageLike(node)) {
      const id = String(node.id);
      if (!seen.has(id)) {
        seen.add(id);
        const from = normalizePhone(node.from);
        const to = normalizePhone(node.to);
        const outgoing = node.from_me === true || node.is_from_me === true || (!!businessPhone && from === businessPhone);
        const phone = outgoing
          ? (to && to !== businessPhone ? to : contextPhone)
          : (from && from !== businessPhone ? from : (to && to !== businessPhone ? to : contextPhone));
        await saveMessage({
          id,
          phone,
          name: contextName,
          direction: outgoing ? 'out' : 'in',
          type: node.type,
          raw: node,
          timestamp: node.timestamp ?? node.time ?? node.t,
        });
      }
    }

    for (const [key, child] of Object.entries(node)) {
      if (key === 'metadata' || key === 'errors') continue;
      await visit(child, contextPhone, contextName, depth + 1);
    }
  };

  await visit(value?.history ?? value, null, null, 0);
}

async function handleContactState(value: any) {
  for (const item of Array.isArray(value?.state_sync) ? value.state_sync : []) {
    if (String(item?.type ?? '') !== 'contact') continue;
    const phone = normalizePhone(item?.contact?.phone_number);
    if (!phone) continue;
    const action = String(item?.action ?? '').toLowerCase();
    if (action === 'remove' || action === 'delete') {
      const { error } = await db!.from('whatsapp_contacts').delete().eq('wa_id', phone);
      if (error) throw new Error('Não foi possível atualizar a lista de contatos WhatsApp.');
      continue;
    }
    const name = item?.contact?.full_name ?? item?.contact?.first_name ?? null;
    const { error } = await db!.rpc('gm_whatsapp_ingest_contact', {
      p_phone: phone,
      p_name: name,
      p_raw_payload: item,
      p_at: toIso(item?.metadata?.timestamp),
    });
    if (error) throw new Error('Não foi possível sincronizar um contato WhatsApp.');
  }
}

function eventInfo(payload: any) {
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  const changes = entries.flatMap((entry: any) => Array.isArray(entry?.changes) ? entry.changes : []);
  const fields = [...new Set(changes.map((change: any) => String(change?.field ?? '')).filter(Boolean))];
  const firstValue = changes.find((change: any) => change?.value)?.value ?? {};
  return {
    type: fields.join(',').slice(0, 120) || String(payload?.object ?? 'unknown').slice(0, 120),
    accountId: entries[0]?.id ?? payload?.id ?? null,
    phoneNumberId: firstValue?.metadata?.phone_number_id ?? null,
    changes,
  };
}

async function openEvent(hash: string, payload: any, info: ReturnType<typeof eventInfo>) {
  const existing = await db!.from('whatsapp_webhook_events')
    .select('processing_status,attempt_count,received_at')
    .eq('event_hash', hash)
    .maybeSingle();
  if (existing.error) throw new Error('Não foi possível verificar o evento recebido.');
  if (existing.data && ['processed', 'ignored'].includes(existing.data.processing_status)) return false;

  const row = {
    event_hash: hash,
    event_type: info.type,
    business_account_id: info.accountId,
    phone_number_id: info.phoneNumberId,
    payload,
    processing_status: 'received',
    attempt_count: Number(existing.data?.attempt_count ?? 0) + 1,
    processing_error: null,
    received_at: existing.data?.received_at ?? new Date().toISOString(),
    processed_at: null,
  };
  const { error } = await db!.from('whatsapp_webhook_events').upsert(row, { onConflict: 'event_hash' });
  if (error) throw new Error('Não foi possível arquivar o evento recebido.');
  return true;
}

async function finishEvent(hash: string, state: 'processed' | 'ignored' | 'failed', errorMessage: string | null = null) {
  const { error } = await db!.from('whatsapp_webhook_events')
    .update({
      processing_status: state,
      processing_error: errorMessage,
      processed_at: new Date().toISOString(),
    })
    .eq('event_hash', hash);
  if (error) throw new Error('Não foi possível atualizar o registro do evento.');
}

async function processPayload(payload: any, changes: any[]) {
  if (payload?.object !== 'whatsapp_business_account') return 'ignored' as const;
  if (!changes.length) return 'ignored' as const;

  let handled = 0;
  for (const change of changes) {
    const value = change?.value ?? {};
    const receivedPhoneId = String(value?.metadata?.phone_number_id ?? '');
    if (PHONE_NUMBER_ID && receivedPhoneId && receivedPhoneId !== PHONE_NUMBER_ID) continue;

    const field = String(change?.field ?? '').toLowerCase();
    if (field === 'messages') {
      await handleInbound(value);
      handled++;
    } else if (field === 'smb_message_echoes' || field === 'message_echoes') {
      await handleEchoes(value);
      handled++;
    } else if (field === 'history' || Array.isArray(value?.history)) {
      await handleHistory(value);
      handled++;
    } else if (field === 'smb_app_state_sync') {
      await handleContactState(value);
      handled++;
    }
    // Unknown Meta webhook fields remain available in whatsapp_webhook_events.payload.
  }
  return handled ? 'processed' as const : 'ignored' as const;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode') ?? url.searchParams.get('hub[mode]');
    const token = url.searchParams.get('hub.verify_token') ?? url.searchParams.get('hub[verify_token]');
    const challenge = url.searchParams.get('hub.challenge') ?? url.searchParams.get('hub[challenge]');

    if (mode === 'subscribe' && VERIFY_TOKEN && token === VERIFY_TOKEN && challenge !== null) {
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    if (url.searchParams.has('hub.mode') || url.searchParams.has('hub[mode]')) {
      return new Response('Forbidden', { status: 403 });
    }
    return json({
      ready: !!db && !!VERIFY_TOKEN && !!APP_SECRET && !!PHONE_NUMBER_ID,
      signatureVerification: !!APP_SECRET,
      verificationTokenConfigured: !!VERIFY_TOKEN,
      phoneNumberConfigured: !!PHONE_NUMBER_ID,
      mediaArchivingConfigured: !!ACCESS_TOKEN,
      mediaStorageBucketConfigured: true,
      automaticReplies: false,
    });
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!db || !VERIFY_TOKEN || !APP_SECRET) return new Response('Webhook not configured', { status: 503 });

  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return new Response('Payload too large', { status: 413 });
  if (!(await validMetaSignature(raw, req.headers.get('x-hub-signature-256')))) {
    return new Response('Invalid signature', { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const info = eventInfo(payload);
  const hash = await sha256(raw);
  try {
    const shouldProcess = await openEvent(hash, payload, info);
    if (!shouldProcess) return new Response('EVENT_RECEIVED', { status: 200 });

    try {
      const state = await processPayload(payload, info.changes);
      await finishEvent(hash, state);
      return new Response('EVENT_RECEIVED', { status: 200 });
    } catch (error) {
      console.error('WhatsApp webhook persistence error:', error instanceof Error ? error.message : 'unknown error');
      try {
        await finishEvent(hash, 'failed', 'Falha ao salvar os dados do evento.');
      } catch (loggingError) {
        console.error('WhatsApp webhook audit update failed:', loggingError instanceof Error ? loggingError.message : 'unknown error');
      }
      return new Response('Temporary persistence failure', { status: 500 });
    }
  } catch (error) {
    console.error('WhatsApp webhook audit failure:', error instanceof Error ? error.message : 'unknown error');
    return new Response('Temporary persistence failure', { status: 500 });
  }
});
