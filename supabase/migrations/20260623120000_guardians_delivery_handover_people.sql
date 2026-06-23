alter table if exists public.people
  add column if not exists strategic_answers text not null default '',
  add column if not exists leadership_checklist jsonb not null default '[]'::jsonb,
  add column if not exists future_leadership_match text not null default '',
  add column if not exists future_leadership_gap text not null default '',
  add column if not exists future_leadership_decision text not null default '';

alter table if exists public.handover_checklist
  add column if not exists section text not null default 'handover';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'handover_checklist_section_check'
      and conrelid = 'public.handover_checklist'::regclass
  ) then
    alter table public.handover_checklist
      add constraint handover_checklist_section_check
      check (section in ('handover', 'administrativo'));
  end if;
end;
$$;

create table if not exists public.guardians (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  process_name text not null,
  process_description text not null default '',
  guardian_person text not null default '',
  routine_id uuid,
  follow_up_frequency text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.delivery_guide_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  milestone text not null default '30 dias' check (milestone in ('30 dias', '60 dias', '90 dias', '120 dias')),
  category text not null default '',
  priority text not null default 'Media' check (priority in ('Alta', 'Media', 'Baixa')),
  planned_date date,
  completed_date date,
  status text not null default 'Nao iniciado' check (status in ('Nao iniciado', 'Em andamento', 'Concluido')),
  expected_result text not null default '',
  achieved_result text not null default '',
  comments text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.success_indicators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  indicator text not null,
  expected_result text not null default '',
  current_result text not null default '',
  status text not null default 'Nao iniciado' check (status in ('Nao iniciado', 'Em andamento', 'Concluido', 'Em risco')),
  target_date date,
  owner text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guardians_user_id_idx on public.guardians(user_id);
create index if not exists delivery_guide_items_user_id_milestone_idx on public.delivery_guide_items(user_id, milestone);
create index if not exists success_indicators_user_id_idx on public.success_indicators(user_id);
create index if not exists handover_checklist_user_id_section_idx on public.handover_checklist(user_id, section);

drop trigger if exists touch_guardians_updated_at on public.guardians;
create trigger touch_guardians_updated_at
  before update on public.guardians
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_delivery_guide_items_updated_at on public.delivery_guide_items;
create trigger touch_delivery_guide_items_updated_at
  before update on public.delivery_guide_items
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_success_indicators_updated_at on public.success_indicators;
create trigger touch_success_indicators_updated_at
  before update on public.success_indicators
  for each row execute function public.touch_updated_at();

alter table public.guardians enable row level security;
alter table public.delivery_guide_items enable row level security;
alter table public.success_indicators enable row level security;

drop policy if exists guardians_owner_viewer_select on public.guardians;
drop policy if exists guardians_owner_insert on public.guardians;
drop policy if exists guardians_owner_update on public.guardians;
drop policy if exists guardians_owner_delete on public.guardians;

create policy guardians_owner_viewer_select on public.guardians
  for select to authenticated using (app_private.can_read_first100days(user_id));
create policy guardians_owner_insert on public.guardians
  for insert to authenticated with check (app_private.can_write_first100days(user_id));
create policy guardians_owner_update on public.guardians
  for update to authenticated using (app_private.can_write_first100days(user_id))
  with check (app_private.can_write_first100days(user_id));
create policy guardians_owner_delete on public.guardians
  for delete to authenticated using (app_private.can_write_first100days(user_id));

drop policy if exists delivery_guide_items_owner_viewer_select on public.delivery_guide_items;
drop policy if exists delivery_guide_items_owner_insert on public.delivery_guide_items;
drop policy if exists delivery_guide_items_owner_update on public.delivery_guide_items;
drop policy if exists delivery_guide_items_owner_delete on public.delivery_guide_items;

create policy delivery_guide_items_owner_viewer_select on public.delivery_guide_items
  for select to authenticated using (app_private.can_read_first100days(user_id));
create policy delivery_guide_items_owner_insert on public.delivery_guide_items
  for insert to authenticated with check (app_private.can_write_first100days(user_id));
create policy delivery_guide_items_owner_update on public.delivery_guide_items
  for update to authenticated using (app_private.can_write_first100days(user_id))
  with check (app_private.can_write_first100days(user_id));
create policy delivery_guide_items_owner_delete on public.delivery_guide_items
  for delete to authenticated using (app_private.can_write_first100days(user_id));

drop policy if exists success_indicators_owner_viewer_select on public.success_indicators;
drop policy if exists success_indicators_owner_insert on public.success_indicators;
drop policy if exists success_indicators_owner_update on public.success_indicators;
drop policy if exists success_indicators_owner_delete on public.success_indicators;

create policy success_indicators_owner_viewer_select on public.success_indicators
  for select to authenticated using (app_private.can_read_first100days(user_id));
create policy success_indicators_owner_insert on public.success_indicators
  for insert to authenticated with check (app_private.can_write_first100days(user_id));
create policy success_indicators_owner_update on public.success_indicators
  for update to authenticated using (app_private.can_write_first100days(user_id))
  with check (app_private.can_write_first100days(user_id));
create policy success_indicators_owner_delete on public.success_indicators
  for delete to authenticated using (app_private.can_write_first100days(user_id));

grant select, insert, update, delete on public.guardians to authenticated;
grant select, insert, update, delete on public.delivery_guide_items to authenticated;
grant select, insert, update, delete on public.success_indicators to authenticated;
grant select, insert, update, delete on public.people to authenticated;
grant select, insert, update, delete on public.handover_checklist to authenticated;

insert into public.guardians (user_id, process_name, process_description, follow_up_frequency)
select owner.id, seed.process_name, seed.process_description, 'Mensal'
from auth.users owner
cross join (values
  ('Guardiao do Orcamento Financeiro', 'Acompanhar disciplina orcamentaria, compromissos financeiros e conexao com Financas.'),
  ('Guardiao do Matricial da Area', 'Garantir governanca do matricial, responsabilidades e ritos de acompanhamento.'),
  ('Guardiao de Conformidade Juridica', 'Zelar por contratos, pareceres, riscos juridicos e aderencia aos fluxos de conformidade.')
) as seed(process_name, process_description)
where lower(owner.email) = 'diaswagnerjr@gmail.com'
  and not exists (
    select 1
    from public.guardians existing
    where existing.user_id = owner.id
      and lower(existing.process_name) = lower(seed.process_name)
  );

insert into public.success_indicators (user_id, indicator, owner, status)
select owner.id, seed.indicator, 'Wagner', 'Nao iniciado'
from auth.users owner
cross join (values
  ('Definir estrutura organizacional'),
  ('Fechar posicoes criticas'),
  ('Engajamento do time'),
  ('Captura financeira'),
  ('Roadmap da area aprovado'),
  ('Governanca implantada')
) as seed(indicator)
where lower(owner.email) = 'diaswagnerjr@gmail.com'
  and not exists (
    select 1
    from public.success_indicators existing
    where existing.user_id = owner.id
      and lower(existing.indicator) = lower(seed.indicator)
  );

insert into public.handover_checklist (user_id, item, status, owner, cluster, section)
select owner.id, seed.item, 'Nao iniciado', 'Wagner / Thais', 'Handover administrativo', 'administrativo'
from auth.users owner
cross join (values
  ('Cartao Corporativo'),
  ('Acessos SAP'),
  ('Acessos S4'),
  ('Celular Corporativo'),
  ('Notebook'),
  ('OneDrive'),
  ('Pastas Compartilhadas'),
  ('Teams'),
  ('Power BI'),
  ('Coupa'),
  ('Alcadas'),
  ('Assinaturas Eletronicas'),
  ('Listas de Distribuicao'),
  ('Agenda de Stakeholders'),
  ('Outros')
) as seed(item)
where lower(owner.email) = 'diaswagnerjr@gmail.com'
  and not exists (
    select 1
    from public.handover_checklist existing
    where existing.user_id = owner.id
      and lower(existing.item) = lower(seed.item)
  );
