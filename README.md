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
- Categorias
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
3. Confira se Auth esta habilitado com e-mail/senha.
4. Crie um usuario pelo app. O trigger `seed_first100days_user` vai popular os dados iniciais para esse usuario.

As tabelas usam `user_id`, RLS habilitado e policies que permitem ao usuario autenticado acessar apenas os proprios registros.

## GitHub Pages

Configure no repositorio:

- Secret `VITE_SUPABASE_URL`
- Secret `VITE_SUPABASE_ANON_KEY`
- Variable `VITE_FIRST_DAY`

O workflow em `.github/workflows/deploy.yml` publica o build em GitHub Pages quando houver push na `main`.

## Proximas entregas

- Organograma atual/futuro
- Simulacoes de estrutura
- Early wins com matriz impacto x esforco
- Agenda e exportacao `.ics`
- Exportacao CSV
- Estrategia final e plano pos-100 dias
