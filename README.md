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
- Countdown recalculado com inicio em `22/06/2026` e checkpoints de 30, 60 e 100 dias
- Coaching com pacote de 6 sessoes, historico e preparacao da proxima conversa
- Rotinas da Area por Tecnologia, Facilities / SSQV, Marketing, Rotinas Internas e Outras, com dashboard executivo clicavel
- Guardioes de processos, rituais e temas estruturais da area
- Guia de Entregas com marcos de 30, 60, 90 e 120 dias e indicadores de sucesso da gestao
- Tema claro/escuro
- Exportacao `.ics` para Outlook/iPhone
- Atalho de WhatsApp para fornecedores
- Anexos persistidos em itens de handover
- Contador de acessos e alteracoes
- Modo Editar/Salvar/Limpar com confirmacao nos modulos operacionais
- Sliders 1-5 de hard skills e soft skills em Pessoas
- Controle de categorias nao atribuidas e matriz pessoa x categorias
- Carteiras de Pessoas carregadas da planilha `Analise de Carteiras.xlsx`, com categorias editaveis por pessoa
- Avaliacao SOMMOS pre-carregada para o time, preservando edicao manual
- Campos de Pessoas reorganizados em capacidades atuais, capacidades futuras, gaps, PDI orientado e anotacoes
- Handover agrupavel por cluster
- Checklist administrativo no Handover Thais, com inclusao e exclusao de itens
- Cards de Keyze e Juliana destacados como liderancas-chave, com perguntas estrategicas, checklist de validacao e avaliacao de match futuro
- Acesso restrito ao editor `diaswagnerjr@gmail.com` e ao visualizador `wagnerdj@suzano.com.br`
- Banco Supabase com RLS por usuario
- Seed automatico por usuario novo

## Dados iniciais

Os dados de spend foram extraidos das planilhas anexadas:

- `Spend por fornecedor 2025 e 2026 ytd.xlsx`: 525 fornecedores, total aproximado de R$ 2,030 bi.
- `Spend categorias pb.xlsx`: 41 categorias, total aproximado de R$ 1,904 bi.
- `Analise de Carteiras.xlsx`: mapa de categorias por pessoa usado para preencher carteiras na aba Pessoas.

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
VITE_FIRST_DAY=2026-06-22
```

Se as variaveis de Supabase nao estiverem configuradas, o app abre em modo demo local para navegacao e validacao visual.

## Supabase

1. Abra o projeto Supabase `first100days`.
2. Execute o SQL em `supabase/migrations/20260605180000_initial_schema.sql` no SQL Editor.
3. Execute o SQL incremental em `supabase/migrations/20260605203000_first100days_expansion.sql`.
4. Execute o SQL incremental em `supabase/migrations/20260607120000_functional_adjustments.sql`.
5. Execute o SQL incremental em `supabase/migrations/20260607153000_final_operational_adjustments.sql`.
6. Execute o SQL incremental em `supabase/migrations/20260607165000_owner_viewer_access.sql`.
7. Execute o SQL incremental em `supabase/migrations/20260621190000_coaching_client_routines_and_timeline.sql`.
8. Execute o SQL incremental em `supabase/migrations/20260623120000_guardians_delivery_handover_people.sql`.
9. Execute o SQL incremental em `supabase/migrations/20260629120000_people_carteiras_sommos_capabilities.sql`.
10. Confira se Auth esta habilitado com e-mail/senha.
11. Crie ou confirme o usuario visualizador `wagnerdj@suzano.com.br` com senha `123456!` no Auth, caso o projeto exija confirmacao de e-mail.

As tabelas usam `user_id`, RLS habilitado e policies que permitem ao usuario autenticado acessar apenas os proprios registros.

Tabelas principais:

- `people`, `stakeholders`, `suppliers`, `categories`, `diagnosis`
- `methodology_pillars`, `pillar_decisions`
- `handover_checklist`
- `coaching_sessions`, `client_routines`, `guardians`
- `delivery_guide_items`, `success_indicators`
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
- A migration de acesso troca as policies para permitir escrita somente ao usuario principal e leitura ao visualizador autorizado.
- A migration `20260623120000_guardians_delivery_handover_people.sql` adiciona somente estruturas incrementais: novos campos em Pessoas, secao do handover, Guardioes, Guia de Entregas e Indicadores de Sucesso. Ela nao apaga, sobrescreve ou reinicializa dados cadastrados.
- A migration `20260629120000_people_carteiras_sommos_capabilities.sql` adiciona campos incrementais em Pessoas, carrega SOMMOS e une as categorias da planilha de carteiras com qualquer atribuicao ja existente. Ela nao apaga anotacoes antigas.
- A guia `Estrutura` foi removida da navegacao, mas as tabelas antigas `org_scenarios` e `org_scenario_items` foram preservadas para compatibilidade e historico.

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
