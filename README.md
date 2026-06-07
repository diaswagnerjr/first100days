# First 100 Days

Sistema pessoal para gerenciar os primeiros 100 dias como Gerente de Suprimentos da Suzano, inspirado em `The First 90 Days` e adaptado para uma transicao de 100 dias.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Supabase Auth + Postgres + RLS
- GitHub Pages

## Primeira entrega

- Login com Supabase Auth
- Dashboard executivo
- Diagnostico inicial
- Pessoas
- Stakeholders
- Fornecedores estrategicos
- Categorias como base de spend e referencia para Pessoas/Estrutura
- Pilares metodologicos dos 100 dias
- Handover Thais
- Simulacao de estrutura organizacional
- Tema claro/escuro
- Exportacao `.ics` para Outlook/iPhone
- Atalho de WhatsApp para fornecedores
- Anexos persistidos em itens de handover
- Contador de acessos e alteracoes
- Modo Editar/Salvar/Limpar com confirmacao nos modulos operacionais
- Sliders 1-5 de hard skills e soft skills em Pessoas
- Controle de categorias nao atribuidas e matriz pessoa x categorias
- Handover agrupavel por cluster
- Cenarios de estrutura com pessoas, reportes, clusters, categorias e organograma gerado
- Banco Supabase com RLS por usuario
- Seed automatico por usuario novo

## Dados iniciais

Os dados de spend foram extraidos das planilhas anexadas:

- `Spend por fornecedor 2025 e 2026 ytd.xlsx`: 525 fornecedores, total aproximado de R$ 2,030 bi.
- `Spend categorias pb.xlsx`: 41 categorias, total aproximado de R$ 1,904 bi.

O seed tambem inclui as 11 pessoas iniciais do time e os principais grupos de stakeholders.

## Setup local

```bash
npm install
cp .env.example .env
npm run dev
```

Preencha `.env`:

```bash
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
VITE_FIRST_DAY=2026-06-05
```

Se as variaveis de Supabase nao estiverem configuradas, o app abre em modo demo local para navegacao e validacao visual.

## Supabase

1. Abra o projeto Supabase `first100days`.
2. Execute o SQL em `supabase/migrations/20260605180000_initial_schema.sql` no SQL Editor.
3. Execute o SQL incremental em `supabase/migrations/20260605203000_first100days_expansion.sql`.
4. Execute o SQL incremental em `supabase/migrations/20260607120000_functional_adjustments.sql`.
5. Execute o SQL incremental em `supabase/migrations/20260607153000_final_operational_adjustments.sql`.
6. Confira se Auth esta habilitado com e-mail/senha.
7. Crie um usuario pelo app. Os triggers de seed populam os dados iniciais e os modulos expandidos para esse usuario.

As tabelas usam `user_id`, RLS habilitado e policies que permitem ao usuario autenticado acessar apenas os proprios registros.

Tabelas principais:

- `people`, `stakeholders`, `suppliers`, `categories`, `diagnosis`
- `methodology_pillars`, `pillar_decisions`
- `handover_checklist`
- `org_scenarios`, `org_scenario_items`
- `meetings`, `reminders`
- `profiles`, `user_preferences`

Observacao de seguranca: use apenas `VITE_SUPABASE_ANON_KEY`/publishable key no front-end. Nunca publique `service_role` ou secret key no GitHub Pages.

Notas funcionais:

- A aba `Categorias` nao aparece no menu principal, mas a tabela `categories` continua sendo usada no dashboard, em Pessoas e na simulacao de estrutura.
- O progresso geral considera Pessoas, Handover Thais, Stakeholders, Fornecedores e Pilares dos 100 dias.
- O modo claro/escuro usa upsert por `user_id` em `user_preferences`, evitando duplicidade de preferencia.
- Anexos do handover sao salvos em `handover_checklist.attachments` como JSON para permitir download posterior.
- Se fornecedores ou categorias estiverem vazios para um usuario existente, o app repopula essas tabelas a partir das planilhas no proximo carregamento.
- A migration final adiciona `hard_skills_score`, `soft_skills_score` e `handover_checklist.cluster`, alem de trigger para classificar novos itens de handover.

## GitHub Pages

Configure no repositorio:

- Secret `VITE_SUPABASE_URL`
- Secret `VITE_SUPABASE_ANON_KEY`
- Variable `VITE_FIRST_DAY`

O workflow em `.github/workflows/deploy.yml` publica o build em GitHub Pages quando houver push na `main`.

Depois de alterar migrations:

1. Execute o SQL no Supabase SQL Editor.
2. Rode `npm run build` localmente quando as dependencias estiverem instaladas.
3. Faça push na `main`.
4. Acompanhe o workflow `Deploy GitHub Pages` em Actions.
5. Acesse `https://diaswagnerjr.github.io/first100days/`.

## Proximas entregas

- Early wins com matriz impacto x esforco
- Exportacao CSV
- Estrategia final e plano pos-100 dias
