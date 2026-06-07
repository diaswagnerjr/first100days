alter table if exists public.people
  add column if not exists category_ids jsonb not null default '[]'::jsonb,
  add column if not exists hard_skills text default '',
  add column if not exists soft_skills text default '',
  add column if not exists potential_notes text default '';

alter table if exists public.stakeholders
  add column if not exists conversation_date date,
  add column if not exists interaction_status text default 'Nao iniciado';

alter table if exists public.suppliers
  add column if not exists conversation_date date,
  add column if not exists interaction_status text default 'Nao iniciado',
  add column if not exists next_steps text default '';

alter table if exists public.methodology_pillars
  add column if not exists explanation text default '',
  add column if not exists expected text default '',
  add column if not exists next_steps text default '';

alter table if exists public.handover_checklist
  add column if not exists attachments jsonb not null default '[]'::jsonb;

alter table if exists public.org_scenario_items
  add column if not exists category_ids jsonb not null default '[]'::jsonb,
  add column if not exists spend_responsibility numeric(16,2) default 0;

alter table if exists public.user_preferences
  add column if not exists access_count integer not null default 0,
  add column if not exists mutation_count integer not null default 0,
  add column if not exists last_accessed_at timestamptz,
  add column if not exists previous_accessed_at timestamptz;

drop trigger if exists touch_methodology_pillars_updated_at on public.methodology_pillars;
create trigger touch_methodology_pillars_updated_at before update on public.methodology_pillars for each row execute function public.touch_updated_at();

drop trigger if exists touch_handover_checklist_updated_at on public.handover_checklist;
create trigger touch_handover_checklist_updated_at before update on public.handover_checklist for each row execute function public.touch_updated_at();

drop trigger if exists touch_org_scenarios_updated_at on public.org_scenarios;
create trigger touch_org_scenarios_updated_at before update on public.org_scenarios for each row execute function public.touch_updated_at();

drop trigger if exists touch_org_scenario_items_updated_at on public.org_scenario_items;
create trigger touch_org_scenario_items_updated_at before update on public.org_scenario_items for each row execute function public.touch_updated_at();

drop trigger if exists touch_user_preferences_updated_at on public.user_preferences;
create trigger touch_user_preferences_updated_at before update on public.user_preferences for each row execute function public.touch_updated_at();

update public.people set name = 'João Victor' where name = 'Joao Victor';
update public.people set role = 'Estagiária' where name = 'Isabella da Silva' and role = 'Estagiaria';

update public.handover_checklist
set owner = replace(owner, 'Juliana', 'Thais')
where owner ilike '%Juliana%';

delete from public.handover_checklist old
using public.handover_checklist newer
where old.user_id = newer.user_id
  and old.item = 'Problemas de performance'
  and newer.item = 'Performance de cada pessoa do time';

update public.handover_checklist
set item = 'Performance de cada pessoa do time'
where item = 'Problemas de performance';

delete from public.handover_checklist old
using public.handover_checklist newer
where old.user_id = newer.user_id
  and old.item = 'Situacao de cada pessoa do time'
  and newer.item = 'Potenciais e sucessao';

update public.handover_checklist
set item = 'Potenciais e sucessao'
where item = 'Situacao de cada pessoa do time';

delete from public.handover_checklist old
using public.handover_checklist newer
where old.user_id = newer.user_id
  and old.item = 'Recomendacoes da Juliana'
  and newer.item = 'Recomendacoes da Thais';

update public.handover_checklist
set item = 'Recomendacoes da Thais'
where item = 'Recomendacoes da Juliana';

with users as (
  select distinct user_id from public.handover_checklist
),
items(item, sort_order) as (
  values
    ('Distribuicao atual das carteiras', 1),
    ('Principais contratos criticos', 2),
    ('Principais fornecedores', 3),
    ('Stakeholders mais sensiveis', 4),
    ('Rotinas da area', 5),
    ('Reunioes recorrentes', 6),
    ('Pipeline de sourcing', 7),
    ('Oportunidades financeiras', 8),
    ('Riscos atuais', 9),
    ('Performance de cada pessoa do time', 10),
    ('Potenciais e sucessao', 11),
    ('Pontos de atencao do time', 12),
    ('Historico de decisoes relevantes', 13),
    ('Temas pendentes de SAP/S4', 14),
    ('Quick wins ja mapeados', 15),
    ('Pontos politicos sensiveis', 16),
    ('Recomendacoes da Thais', 17)
)
insert into public.handover_checklist (user_id, item, status, owner)
select users.user_id, items.item, 'Nao iniciado', 'Wagner / Thais'
from users cross join items
on conflict (user_id, item) do nothing;

delete from public.handover_checklist a
using public.handover_checklist b
where a.ctid < b.ctid
  and a.user_id = b.user_id
  and a.item = b.item;

delete from public.handover_checklist
where item not in (
  'Distribuicao atual das carteiras',
  'Principais contratos criticos',
  'Principais fornecedores',
  'Stakeholders mais sensiveis',
  'Rotinas da area',
  'Reunioes recorrentes',
  'Pipeline de sourcing',
  'Oportunidades financeiras',
  'Riscos atuais',
  'Performance de cada pessoa do time',
  'Potenciais e sucessao',
  'Pontos de atencao do time',
  'Historico de decisoes relevantes',
  'Temas pendentes de SAP/S4',
  'Quick wins ja mapeados',
  'Pontos politicos sensiveis',
  'Recomendacoes da Thais'
);

update public.methodology_pillars
set
  explanation = case name
    when 'Match Strategy to Situation' then 'Diagnosticar se a situacao pede turnaround, realignment, sustaining success ou startup.'
    when 'Accelerate Learning' then 'Aprender rapido sobre negocio, pessoas, contratos, fornecedores e governanca.'
    when 'Build Coalitions' then 'Construir apoio com stakeholders criticos e patrocinadores.'
    when 'Secure Early Wins' then 'Escolher vitorias iniciais criveis e visiveis.'
    when 'Align Structure' then 'Ajustar desenho organizacional, rotinas e responsabilidades.'
    when 'Build Your Team' then 'Avaliar o time, potenciais, riscos, sucessao e desenvolvimento.'
    when 'Create a Vision' then 'Consolidar narrativa e direcao pos-100 dias.'
    else explanation
  end,
  expected = case name
    when 'Match Strategy to Situation' then 'Definir a leitura da situacao e adaptar prioridades, tom e ritmo.'
    when 'Accelerate Learning' then 'Registrar hipoteses, evidencias e aprendizados antes de decidir.'
    when 'Build Coalitions' then 'Mapear aliados, resistencias e compromissos.'
    when 'Secure Early Wins' then 'Criar tracao sem dispersar energia do plano principal.'
    when 'Align Structure' then 'Propor estrutura coerente com categorias, spend e capacidades.'
    when 'Build Your Team' then 'Ter plano claro por pessoa e por carteira.'
    when 'Create a Vision' then 'Preparar mensagem para diretoria e plano de continuidade.'
    else expected
  end
where coalesce(explanation, '') = '' or coalesce(expected, '') = '';

update public.suppliers
set conversation_date = coalesce(conversation_date, first_interaction),
    interaction_status = coalesce(nullif(interaction_status, ''), nullif(relationship_status, ''), 'Nao iniciado'),
    next_steps = coalesce(nullif(next_steps, ''), nullif(action_plan, ''), '')
where true;

update public.stakeholders
set conversation_date = coalesce(conversation_date, first_conversation),
    interaction_status = coalesce(nullif(interaction_status, ''), 'Nao iniciado')
where true;

grant select, insert, update, delete on public.people to authenticated;
grant select, insert, update, delete on public.stakeholders to authenticated;
grant select, insert, update, delete on public.suppliers to authenticated;
grant select, insert, update, delete on public.methodology_pillars to authenticated;
grant select, insert, update, delete on public.handover_checklist to authenticated;
grant select, insert, update, delete on public.org_scenario_items to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;

create schema if not exists app_private;

create or replace function app_private.seed_first100days_functional_adjustments(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.people set name = 'João Victor' where user_id = target_user and name = 'Joao Victor';
  update public.people set role = 'Estagiária' where user_id = target_user and name = 'Isabella da Silva' and role = 'Estagiaria';

  update public.handover_checklist set owner = replace(owner, 'Juliana', 'Thais') where user_id = target_user and owner ilike '%Juliana%';
  delete from public.handover_checklist old using public.handover_checklist newer where old.user_id = target_user and old.user_id = newer.user_id and old.item = 'Problemas de performance' and newer.item = 'Performance de cada pessoa do time';
  update public.handover_checklist set item = 'Performance de cada pessoa do time' where user_id = target_user and item = 'Problemas de performance';
  delete from public.handover_checklist old using public.handover_checklist newer where old.user_id = target_user and old.user_id = newer.user_id and old.item = 'Situacao de cada pessoa do time' and newer.item = 'Potenciais e sucessao';
  update public.handover_checklist set item = 'Potenciais e sucessao' where user_id = target_user and item = 'Situacao de cada pessoa do time';
  delete from public.handover_checklist old using public.handover_checklist newer where old.user_id = target_user and old.user_id = newer.user_id and old.item = 'Recomendacoes da Juliana' and newer.item = 'Recomendacoes da Thais';
  update public.handover_checklist set item = 'Recomendacoes da Thais' where user_id = target_user and item = 'Recomendacoes da Juliana';

  insert into public.handover_checklist (user_id, item, status, owner)
  values
    (target_user, 'Distribuicao atual das carteiras', 'Nao iniciado', 'Wagner / Thais'),
    (target_user, 'Principais contratos criticos', 'Nao iniciado', 'Wagner / Thais'),
    (target_user, 'Principais fornecedores', 'Nao iniciado', 'Wagner / Thais'),
    (target_user, 'Stakeholders mais sensiveis', 'Nao iniciado', 'Wagner / Thais'),
    (target_user, 'Rotinas da area', 'Nao iniciado', 'Wagner / Thais'),
    (target_user, 'Reunioes recorrentes', 'Nao iniciado', 'Wagner / Thais'),
    (target_user, 'Pipeline de sourcing', 'Nao iniciado', 'Wagner / Thais'),
    (target_user, 'Oportunidades financeiras', 'Nao iniciado', 'Wagner / Thais'),
    (target_user, 'Riscos atuais', 'Nao iniciado', 'Wagner / Thais'),
    (target_user, 'Performance de cada pessoa do time', 'Nao iniciado', 'Wagner / Thais'),
    (target_user, 'Potenciais e sucessao', 'Nao iniciado', 'Wagner / Thais'),
    (target_user, 'Pontos de atencao do time', 'Nao iniciado', 'Wagner / Thais'),
    (target_user, 'Historico de decisoes relevantes', 'Nao iniciado', 'Wagner / Thais'),
    (target_user, 'Temas pendentes de SAP/S4', 'Nao iniciado', 'Wagner / Thais'),
    (target_user, 'Quick wins ja mapeados', 'Nao iniciado', 'Wagner / Thais'),
    (target_user, 'Pontos politicos sensiveis', 'Nao iniciado', 'Wagner / Thais'),
    (target_user, 'Recomendacoes da Thais', 'Nao iniciado', 'Wagner / Thais')
  on conflict (user_id, item) do nothing;
end;
$$;

create or replace function app_private.seed_first100days_functional_adjustments_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform app_private.seed_first100days_functional_adjustments(new.id);
  return new;
end;
$$;

drop trigger if exists seed_first100days_functional_adjustments_user on auth.users;
create trigger seed_first100days_functional_adjustments_user
  after insert on auth.users
  for each row execute function app_private.seed_first100days_functional_adjustments_trigger();

do $$
declare
  app_user record;
begin
  for app_user in select id from auth.users loop
    perform app_private.seed_first100days_functional_adjustments(app_user.id);
  end loop;
end;
$$;
