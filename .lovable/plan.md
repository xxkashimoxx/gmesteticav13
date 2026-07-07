# Plano de refinamento para uso diário na clínica

Objetivo: transformar o sistema atual (bem completo em telas, mas ainda genérico) em uma ferramenta que a Dra. e a recepção usem todo dia sem atrito. Foco nos 3 fluxos que você marcou como críticos.

---

## 1. Agenda do dia (tela principal do dia a dia)

Nova página "Hoje" (será o novo Dashboard da recepção), separada da agenda completa:

- **Timeline vertical do dia** com os agendamentos em ordem cronológica.
- **Status operacional por card** (com 1 clique):
  `Agendado → Confirmado → Chegou → Em atendimento → Concluído → Pago` (ou `Faltou` / `Cancelado`).
- **Ações rápidas em cada card**: WhatsApp (abre wa.me com template do status), abrir ficha, registrar pagamento, remarcar.
- **Painel lateral** com: próximos lembretes WhatsApp pendentes (24h/2h), aniversariantes do dia, faltas da semana.
- **Contadores do topo**: agendados hoje, confirmados, faturamento previsto x realizado do dia.

Impacto no backend: adicionar coluna `status` em `appointments` com enum operacional, e `checked_in_at`, `started_at`, `finished_at`, `paid_at` para métricas.

---

## 2. Ficha do paciente (prontuário estético)

Reformulação da página do paciente em abas:

- **Resumo** — dados de contato, tags (VIP, alergia, gestante), próximos agendamentos, LTV.
- **Anamnese** — formulário com campos típicos de estética: alergias, medicamentos em uso, gestação/lactação, uso de ácidos, procedimentos anteriores, contraindicações. Versionado (histórico de atualizações).
- **Histórico de atendimentos** — lista cronológica de procedimentos realizados com notas clínicas, produtos usados (marca, lote, validade), profissional responsável.
- **Evolução com fotos** — antes/depois por sessão, com data. Upload direto (câmera no celular).
- **Plano de tratamento** — sessões previstas x realizadas, próxima sessão sugerida.
- **Financeiro do paciente** — pago, pendente, parcelas em aberto.

Impacto no backend:
- Nova tabela `patient_anamnesis` (JSON versionado por paciente).
- Nova tabela `patient_photos` (Storage bucket `patient-photos` privado + RLS por dono).
- Nova tabela `clinical_notes` ligada a `appointments`.
- Campo `tags` (array) em `leads`/`profiles-paciente`.

---

## 3. Funil de leads (captação → agendamento em 1 clique)

Refinos no Kanban existente:

- **Colunas fixas do funil estético**: `Novo → Contato feito → Interessado → Agendou avaliação → Compareceu → Fechou procedimento → Perdido`.
- **Cartão com temperatura automática** (Quente/Morno/Frio) já existente, mas recalculada por: tempo sem contato + origem + interações.
- **Botão "Agendar avaliação"** direto no card do lead → abre modal de agendamento pré-preenchido; ao salvar, o lead avança de coluna automaticamente e vira registro de paciente (sem duplicar).
- **Timeline de interações** (WhatsApp enviado, ligação, retorno, tentativas) com 1 clique para registrar.
- **Follow-up sugerido**: leads sem interação há X dias sobem pra topo em vermelho.

Impacto no backend: aproveitar `leads` + `lead_interactions` já existentes; adicionar coluna `stage` alinhada ao novo funil, e trigger que cria/vincula paciente ao fechar.

---

## 4. Onboarding guiado (primeira vez que a Dra. entra)

Wizard de 4 passos, dispensável, mostrado enquanto faltar dado essencial:

1. **Dados da clínica** — nome, telefone, endereço, horário de funcionamento.
2. **Catálogo de procedimentos** — cadastro guiado (nome, duração, preço, categoria). Botão "Adicionar próximo".
3. **Agenda** — dias/horários de atendimento, duração padrão do slot, intervalo entre pacientes.
4. **WhatsApp** — número do consultório e revisão dos 5 templates (confirmação, lembretes, remarcação, cancelamento).

Impacto no backend: nova tabela `clinic_settings` (single-row por admin) com working_hours, contato, templates de mensagem editáveis, onboarding_completed.

---

## 5. Papéis e permissões

Ajuste: seu perfil (você/recepção/manutenção) precisa acessar quase tudo menos configurações críticas. Proposta:

- `admin` (Dra.) — tudo.
- `staff` (você, recepção) — Hoje, Agenda, Pacientes, Leads, Financeiro, Procedimentos. Sem Settings/Integrações críticas.
- `traffic_manager` — Leads, Integrações, Dashboard (como já é).

Se quiser um perfil só "atendente" no futuro, adicionamos depois.

---

## 6. Refinos gerais de UX (dia a dia)

- **Busca global** (Ctrl/Cmd+K) — paciente, lead, agendamento.
- **Notificações in-app** — lembretes de WhatsApp pendentes, aniversariantes, aniversário de tratamento (retorno sugerido).
- **Mobile primeiro em Hoje e Ficha** — recepção usando celular entre atendimentos.
- **Toasts consistentes** e loading states nas ações que hoje piscam.
- **Empty states úteis** — em vez de "sem dados", mostrar próximo passo ("Cadastrar primeiro procedimento").

---

## Detalhes técnicos (referência)

Migrações necessárias, em ordem:

```
1. appointments: add status enum, checked_in_at, started_at, finished_at, paid_at
2. clinic_settings: single-row config + working_hours JSONB + wa_templates JSONB
3. patient_anamnesis: JSONB versionado + FK lead_id
4. clinical_notes: FK appointment_id + note + products_used JSONB
5. patient_photos: FK lead_id + storage_path + session_label + taken_at
   + bucket 'patient-photos' privado com RLS por owner
6. leads: add stage enum operacional + tags text[]
7. user_roles: adicionar valor 'staff' ao enum app_role
```

Todas com GRANT + RLS por `auth.uid()` / `has_role()`. WhatsApp continua `wa.me` (sem custo).

---

## Ordem de execução sugerida

1. Backend (migrações + storage + templates).
2. Onboarding wizard (pra ter dado real pra popular as telas).
3. Página "Hoje" (impacto imediato no dia a dia).
4. Ficha do paciente reformulada.
5. Refino do funil de leads.
6. Papel `staff` + refinos de UX.

Aprove e sigo executando na ordem acima.
