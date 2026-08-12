# Painel GM Estética

Painel interno da Goreti Magalhães Estética Avançada: pacientes, agenda, procedimentos, financeiro, leads e atendimento com IA.

## Rodar no computador

Pré-requisito: Node.js 20 ou superior.

```bash
npm install
npm run dev
```

Para gerar os arquivos prontos para qualquer hospedagem estática:

```bash
npm run build
```

A pasta `dist` pode ser publicada na Vercel, Netlify, Cloudflare Pages, GitHub Pages (com ajuste de rota) ou em um servidor próprio.

## Configuração

Crie um arquivo `.env` a partir de `.env.example` e informe a URL e a chave pública do projeto Supabase.

As Edge Functions ficam em `supabase/functions`. No painel do Supabase, configure:

- `GEMINI_API_KEY` para a IA do atendimento e para sugestões de WhatsApp.
- `ALLOWED_ORIGINS` com as URLs onde o painel será hospedado, separadas por vírgula. Exemplo: `https://painel.seudominio.com,https://www.gmestetica.bond`.
- As chaves padrão do Supabase já são fornecidas ao ambiente das funções.

Jamais coloque chaves privadas, `service_role` ou `GEMINI_API_KEY` no arquivo do frontend.

## Conteúdo do backup

- Código completo do painel React/Vite.
- Migrações e funções do Supabase.
- Versão atual do agente `gm-ai-agent`, com instruções de respostas curtas e sem repetição.
- Referências visuais enviadas para a identidade da GM.

Este projeto é independente da hospedagem: pode ser publicado onde você preferir.
