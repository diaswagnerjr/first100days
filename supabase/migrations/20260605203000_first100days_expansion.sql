alter table if exists public.people
  add column if not exists next_conversation date,
  add column if not exists agenda_status text default 'nao iniciado',
  add column if not exists sommos_score numeric default 0,
  add column if not exists strengths text default '',
  add column if not exists attention_points text default '',
  add column if not exists risks text default '';

alter table if exists public.stakeholders
  add column if not exists criticality text default 'media',
  add column if not exists first_conversation date,
  add column if not exists next_conversation date,
  add column if not exists pains text default '',
  add column if not exists opportunities text default '',
  add column if not exists next_steps text default '',
  add column if not exists notes text default '';

alter table if exists public.suppliers
  add column if not exists related_area text default '',
  add column if not exists phone text default '',
  add column if not exists email text default '',
  add column if not exists first_interaction date,
  add column if not exists next_interaction date,
  add column if not exists relationship_status text default 'mapear',
  add column if not exists notes text default '';

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text default '',
  role text default 'Gerente de Suprimentos',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.methodology_pillars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'Nao iniciado',
  decision text default '',
  decision_date date,
  evidence text default '',
  comments text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.pillar_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pillar_id uuid references public.methodology_pillars(id) on delete cascade,
  decision text not null,
  decision_date date,
  evidence text default '',
  comments text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.handover_checklist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item text not null,
  status text not null default 'Nao iniciado',
  comment text default '',
  owner text default '',
  due_date date,
  links text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, item)
);

create table if not exists public.org_scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  rationale text default '',
  risks text default '',
  recommended_decision text default '',
  status text not null default 'Mapear',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.org_scenario_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scenario_id uuid references public.org_scenarios(id) on delete cascade,
  person_name text not null,
  role text default '',
  cluster text default '',
  manager text default '',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id text default '',
  title text not null,
  meeting_date date,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id text default '',
  title text not null,
  remind_at timestamptz,
  notes text default '',
  status text not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  theme text not null default 'light',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.methodology_pillars enable row level security;
alter table public.pillar_decisions enable row level security;
alter table public.handover_checklist enable row level security;
alter table public.org_scenarios enable row level security;
alter table public.org_scenario_items enable row level security;
alter table public.meetings enable row level security;
alter table public.reminders enable row level security;
alter table public.user_preferences enable row level security;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.methodology_pillars to authenticated;
grant select, insert, update, delete on public.pillar_decisions to authenticated;
grant select, insert, update, delete on public.handover_checklist to authenticated;
grant select, insert, update, delete on public.org_scenarios to authenticated;
grant select, insert, update, delete on public.org_scenario_items to authenticated;
grant select, insert, update, delete on public.meetings to authenticated;
grant select, insert, update, delete on public.reminders to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;

drop policy if exists "Profiles are editable by owner" on public.profiles;
create policy "Profiles are editable by owner"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Methodology pillars are owned by user" on public.methodology_pillars;
create policy "Methodology pillars are owned by user"
  on public.methodology_pillars for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Pillar decisions are owned by user" on public.pillar_decisions;
create policy "Pillar decisions are owned by user"
  on public.pillar_decisions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Handover checklist is owned by user" on public.handover_checklist;
create policy "Handover checklist is owned by user"
  on public.handover_checklist for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Org scenarios are owned by user" on public.org_scenarios;
create policy "Org scenarios are owned by user"
  on public.org_scenarios for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Org scenario items are owned by user" on public.org_scenario_items;
create policy "Org scenario items are owned by user"
  on public.org_scenario_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Meetings are owned by user" on public.meetings;
create policy "Meetings are owned by user"
  on public.meetings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Reminders are owned by user" on public.reminders;
create policy "Reminders are owned by user"
  on public.reminders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "User preferences are owned by user" on public.user_preferences;
create policy "User preferences are owned by user"
  on public.user_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create schema if not exists app_private;

create or replace function app_private.seed_first100days_expansion(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  default_scenario uuid;
begin
  insert into public.profiles (id)
  values (target_user)
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id, theme)
  values (target_user, 'light')
  on conflict (user_id) do nothing;

  insert into public.methodology_pillars (user_id, name, status)
  values
    (target_user, 'Match Strategy to Situation', 'Em andamento'),
    (target_user, 'Accelerate Learning', 'Em andamento'),
    (target_user, 'Build Coalitions', 'Em andamento'),
    (target_user, 'Secure Early Wins', 'Nao iniciado'),
    (target_user, 'Align Structure', 'Nao iniciado'),
    (target_user, 'Build Your Team', 'Em andamento'),
    (target_user, 'Create a Vision', 'Nao iniciado')
  on conflict (user_id, name) do nothing;

  insert into public.handover_checklist (user_id, item, status, owner)
  values
    (target_user, 'Mapa de contratos criticos', 'Nao iniciado', 'Juliana'),
    (target_user, 'Calendario de renovacoes', 'Nao iniciado', 'Juliana'),
    (target_user, 'Sourcing plan vigente', 'Nao iniciado', 'Juliana'),
    (target_user, 'Pipeline de savings', 'Nao iniciado', 'Juliana'),
    (target_user, 'Riscos comerciais e juridicos', 'Nao iniciado', 'Juliana'),
    (target_user, 'Fornecedores em situacao sensivel', 'Nao iniciado', 'Juliana'),
    (target_user, 'Pendencias SAP S4', 'Nao iniciado', 'Juliana'),
    (target_user, 'Rotina financeira', 'Nao iniciado', 'Juliana'),
    (target_user, 'Governanca de comites', 'Nao iniciado', 'Juliana'),
    (target_user, 'Alcadas e aprovadores', 'Nao iniciado', 'Juliana'),
    (target_user, 'Acessos e sistemas', 'Nao iniciado', 'Juliana'),
    (target_user, 'Projetos de TI em curso', 'Nao iniciado', 'Juliana'),
    (target_user, 'Demandas de Facilities', 'Nao iniciado', 'Juliana'),
    (target_user, 'Demandas de Marketing', 'Nao iniciado', 'Juliana'),
    (target_user, 'Temas juridicos abertos', 'Nao iniciado', 'Juliana'),
    (target_user, 'Pontos de atencao do time', 'Nao iniciado', 'Juliana')
  on conflict (user_id, item) do nothing;

  insert into public.org_scenarios (user_id, name, description, status, rationale)
  values (target_user, 'Estrutura atual', 'Retrato inicial do time e clusters atuais.', 'Mapear', 'Base para comparacao dos cenarios futuros.')
  on conflict (user_id, name) do nothing
  returning id into default_scenario;

  if default_scenario is null then
    select id into default_scenario
    from public.org_scenarios
    where user_id = target_user and name = 'Estrutura atual'
    order by created_at
    limit 1;
  end if;

  if default_scenario is not null and not exists (
    select 1 from public.org_scenario_items where user_id = target_user and scenario_id = default_scenario
  ) then
    insert into public.org_scenario_items (user_id, scenario_id, person_name, role, cluster, manager)
    values
      (target_user, default_scenario, 'Juliana', 'Handover e transicao', 'Suprimentos Corporativo', 'Wagner'),
      (target_user, default_scenario, 'Keyze', 'Referente operacional', 'Suprimentos Corporativo', 'Wagner'),
      (target_user, default_scenario, 'Cluster Digital', 'Frente de tecnologia e dados', 'Digital', 'Wagner');
  end if;

  update public.suppliers
  set related_area = case
    when name ilike '%marketing%' or category ilike '%marketing%' then 'Marketing'
    when name ilike '%jurid%' or category ilike '%jurid%' or category ilike '%legal%' then 'Juridico'
    when name ilike '%rh%' or category ilike '%beneficio%' or category ilike '%treinamento%' then 'RH'
    when name ilike '%sap%' or category ilike '%software%' or category ilike '%ti%' then 'TI'
    when category ilike '%facilit%' or category ilike '%predial%' then 'Facilities'
    when category ilike '%finance%' or category ilike '%banco%' then 'Financas'
    else coalesce(nullif(related_area, ''), 'Operacoes')
  end
  where user_id = target_user;

  update public.stakeholders
  set
    next_steps = coalesce(nullif(next_steps, ''), nullif(next_action, ''), next_steps),
    next_conversation = coalesce(next_conversation, next_meeting)
  where user_id = target_user;
end;
$$;

create or replace function app_private.seed_first100days_expansion_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform app_private.seed_first100days_expansion(new.id);
  return new;
end;
$$;

drop trigger if exists seed_first100days_expansion_user on auth.users;
create trigger seed_first100days_expansion_user
  after insert on auth.users
  for each row execute function app_private.seed_first100days_expansion_trigger();

do $$
declare
  app_user record;
begin
  for app_user in select id from auth.users loop
    perform app_private.seed_first100days_expansion(app_user.id);
  end loop;
end;
$$;
