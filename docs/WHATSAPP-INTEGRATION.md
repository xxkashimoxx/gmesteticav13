# GM Estética — Ativação do WhatsApp oficial

## Estado atual

O código da integração está preparado no repositório, mas a ativação real depende de duas etapas externas:

1. aplicar a migration e publicar as Edge Functions no Supabase;
2. criar/configurar o aplicativo no Meta for Developers e obter as credenciais oficiais do WhatsApp Cloud API.

A resposta automática começa **desligada por padrão** (`auto_reply_enabled = false`).

---

## 1. Arquivos preparados

- `supabase/migrations/20260907200000_whatsapp_integration_foundation.sql`
- `supabase/functions/whatsapp-webhook/index.ts`
- `supabase/functions/whatsapp-send/index.ts`

O webhook recebe mensagens, salva histórico, respeita handoff humano e usa a memória já registrada em `ai_training_examples` para gerar respostas via Gemini.

---

## 2. Secrets necessários no Supabase

Em **Supabase > Project Settings > Edge Functions > Secrets**, adicionar:

- `WHATSAPP_ACCESS_TOKEN` — token permanente da Meta. Nunca colocar no frontend.
- `WHATSAPP_PHONE_NUMBER_ID` — Phone Number ID da tela WhatsApp API Setup.
- `WHATSAPP_BUSINESS_ACCOUNT_ID` — WABA ID.
- `WHATSAPP_VERIFY_TOKEN` — texto secreto escolhido pela GM para validar o webhook.
- `META_APP_SECRET` — App Secret do aplicativo Meta.
- `WHATSAPP_API_VERSION` — opcional; ex.: `v23.0`.
- `GEMINI_API_KEY` — já existe no projeto; manter.

Também são usados automaticamente pelo Supabase:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 3. Aplicar banco

No SQL Editor do Supabase, executar o arquivo:

`supabase/migrations/20260907200000_whatsapp_integration_foundation.sql`

Ele cria:

- `whatsapp_contacts`
- `whatsapp_conversations`
- `whatsapp_messages`
- `whatsapp_settings`

A resposta automática fica desligada inicialmente.

---

## 4. Publicar Edge Functions

### whatsapp-webhook

Publicar com JWT desativado, porque a Meta chama o endpoint sem login do Supabase. A função faz validação própria pelo Verify Token e, quando `META_APP_SECRET` estiver configurado, pela assinatura `x-hub-signature-256`.

Endpoint esperado:

`https://ktnwehlysguwtjyshqtc.supabase.co/functions/v1/whatsapp-webhook`

### whatsapp-send

Publicar com JWT **ativado**. Ela serve para envio manual pelo painel depois que o Auth real for restaurado.

---

## 5. Configuração no Meta for Developers

1. Criar/abrir o aplicativo da GM.
2. Adicionar o produto **WhatsApp**.
3. Abrir **WhatsApp > API Setup**.
4. Guardar:
   - Phone Number ID
   - WhatsApp Business Account ID
5. Criar token permanente pelo Business Manager/System User para produção.
6. Abrir **WhatsApp > Configuration > Webhooks**.
7. Callback URL:
   `https://ktnwehlysguwtjyshqtc.supabase.co/functions/v1/whatsapp-webhook`
8. Verify Token: exatamente o mesmo valor salvo como `WHATSAPP_VERIFY_TOKEN` no Supabase.
9. Assinar o campo/evento `messages`.
10. Fazer teste primeiro com o número de teste da Meta.

---

## 6. Fluxo implementado

Quando uma mensagem chega:

1. Meta chama `whatsapp-webhook`.
2. O contato é salvo/atualizado.
3. Uma conversa é criada ou reutilizada.
4. A mensagem é persistida em `whatsapp_messages`.
5. Se houver pedido por humano (`atendente`, `humano`, `recepção`, `falar com a doutora` etc.), a conversa vira `human` e a IA é desligada naquela conversa.
6. Se `auto_reply_enabled = false`, nada automático é enviado.
7. Se estiver ligado, a função consulta exemplos de treinamento da GM, histórico recente e Gemini.
8. A resposta é enviada pela API oficial da Meta e também salva no banco.
9. Status de entrega/leitura recebidos da Meta atualizam a mensagem salva.

---

## 7. Como ligar a resposta automática depois dos testes

Somente depois de validar recebimento e envio manual:

```sql
update public.whatsapp_settings
set auto_reply_enabled = true,
    updated_at = now()
where id = 1;
```

Para desligar imediatamente:

```sql
update public.whatsapp_settings
set auto_reply_enabled = false,
    updated_at = now()
where id = 1;
```

---

## 8. Handoff humano

A conversa pode assumir estes estados:

- `open` — fluxo normal;
- `human` — equipe assumiu, IA desativada;
- `closed` — conversa encerrada.

Quando a cliente pede uma pessoa, a função muda automaticamente para `human`.

---

## 9. Segurança antes do número real

Antes de colocar o número oficial da clínica em produção:

- restaurar Auth real do painel;
- publicar `whatsapp-send` com JWT ligado;
- restringir acesso às conversas a admin/staff;
- manter Access Token somente em Secrets;
- configurar `META_APP_SECRET` para validar assinatura dos webhooks;
- nunca colocar service role ou token Meta em `VITE_*`;
- validar tudo com número de teste da Meta primeiro.

---

## 10. Templates para mensagens iniciadas pela clínica

Para mensagens fora da janela normal de atendimento, criar e aprovar templates na Meta, por exemplo:

- confirmação de consulta;
- lembrete 24h;
- lembrete 1h/2h;
- reagendamento;
- aniversário;
- retorno de procedimento;
- reativação de paciente/lead.

Esses templates são uma etapa posterior ao recebimento/resposta normal do webhook.
