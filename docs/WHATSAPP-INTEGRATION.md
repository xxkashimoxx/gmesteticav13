# WhatsApp Business — integração com o CRM GM

## Estado atual

O projeto Supabase de produção é `btmbtnsoszsypuvongzq`. A migration de ingestão foi aplicada em 23/09/2026. O webhook está publicado com validação de assinatura, registro idempotente dos eventos e respostas automáticas desligadas.

O número continua no WhatsApp Business do celular. A integração do sistema não migra nem desconecta o número. A coexistência, a verificação da empresa e a assinatura dos campos de webhook ainda precisam ser concluídas no painel da Meta.

## O que o sistema grava

- Cada POST válido da Meta é arquivado em `public.whatsapp_webhook_events`, incluindo o payload original, tipo de evento, conta/número e estado de processamento.
- Mensagens recebidas, mensagens enviadas pelo app (ecos), mensagens de histórico e status são gravados em `public.whatsapp_messages` e vinculados ao CRM em `public.lead_interactions`.
- Contatos recebidos ou atualizados pelo sync são gravados em `public.whatsapp_contacts`; contatos removidos deixam de aparecer nessa lista, e o evento de remoção fica arquivado.
- IDs de mensagem e hash do evento impedem duplicação em reenvios. Falhas de gravação respondem HTTP 500 para a Meta tentar novamente.
- Eventos de outros tipos continuam arquivados no payload para investigação.

A tela do CRM forma as conversas pelo telefone usando o modelo que já existe no banco. Não depende das tabelas `whatsapp_conversations` nem `whatsapp_settings`.

### Anexos

Quando a mensagem contém um ID de mídia, o webhook baixa o arquivo pela API da Meta e o guarda no bucket privado `whatsapp-media`. A tela exibe imagens, áudios, vídeos e documentos por links assinados de cinco minutos, somente para usuários autenticados com papel `admin` ou `staff`. O limite de arquivo é 50 MB; acima disso, o sistema preserva mensagem e metadados, mas não o binário. Falhas no download ou armazenamento deixam o evento como falho e respondem HTTP 500 para permitir nova tentativa da Meta.

### Respostas automáticas

A função não chama Gemini nem envia respostas automáticas. As respostas podem continuar sendo feitas pela Meta AI no WhatsApp Business do celular. A tela do CRM permite envio manual pela Cloud API quando a conexão estiver ativa.

## Configuração necessária na Meta

O webhook recebe chamadas em:

`https://btmbtnsoszsypuvongzq.supabase.co/functions/v1/whatsapp-webhook`

No aplicativo e na conta WhatsApp Business corretos:

1. Conclua a verificação da empresa e o onboarding de coexistência de WhatsApp Business App.
2. Mantenha o número conectado ao WhatsApp Business no celular; não escolha um fluxo que transfira o número e desconecte o aplicativo.
3. Configure a URL acima e use como Verify Token o segredo `WHATSAPP_VERIFY_TOKEN` (ou `META_VERIFY_TOKEN`) configurado no Supabase.
4. Assine os campos `messages`, `message_echoes`, `smb_message_echoes`, `history` e `smb_app_state_sync` no WABA/número que receberá os eventos.
5. Habilite o compartilhamento de histórico no onboarding, se quiser que a Meta envie mensagens anteriores e se a conta der esse consentimento.
6. Envie uma mensagem de teste, responda pelo app e confira se entram eventos `messages` e `smb_message_echoes`; consulte a tela WhatsApp do CRM.

`messages` traz mensagens recebidas e estados de entrega/leitura. `message_echoes` registra ecos de mensagens enviadas pela Cloud API. `smb_message_echoes` é o campo necessário para receber ecos das mensagens enviadas pelo WhatsApp Business App ou dispositivos vinculados após coexistência; `smb_app_state_sync` sincroniza atualizações de contatos. O evento `history` depende do fluxo e do compartilhamento de histórico oferecido pela Meta.

## Secrets no Supabase

A Edge Function lê:

- `WHATSAPP_VERIFY_TOKEN` (ou `META_VERIFY_TOKEN`)
- `WHATSAPP_APP_SECRET` (ou `META_APP_SECRET`)
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN` (necessário para arquivar anexos)
- `WHATSAPP_API_VERSION` (opcional; padrão `v23.0`)
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (fornecidos pelo Supabase)

A assinatura `x-hub-signature-256` é obrigatória. A função rejeita POST sem assinatura válida. O service role existe somente no lado servidor. Nunca coloque token Meta nem service role em variável `VITE_*`.

## Persistência e visibilidade

As tabelas de mensagens, contatos e auditoria têm RLS. Usuários autenticados com papel `admin` ou `staff` podem consultar a tela; a função usa service role para gravar webhooks. A tabela de auditoria deve ser tratada como dado sensível porque contém o payload recebido da Meta. O bucket privado de anexos permite leitura apenas a `admin` e `staff`; os uploads são feitos pela função no servidor.

## Limite da conexão

Publicar o webhook prepara o destino, mas não assina automaticamente os campos da Meta nem conclui coexistência. Até a Meta enviar o primeiro evento, a tela mostrará “Ainda não chegou nenhum evento da Meta”. A conexão da Cloud API exibida no painel confirma acesso à API, mas não prova que cada assinatura de webhook esteja ativa.
