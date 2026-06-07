alter table if exists public.people
  add column if not exists hard_skills_score integer not null default 3 check (hard_skills_score between 1 and 5),
  add column if not exists soft_skills_score integer not null default 3 check (soft_skills_score between 1 and 5);

alter table if exists public.handover_checklist
  add column if not exists cluster text default '';

update public.people
set hard_skills_score = coalesce(nullif(hard_skills_score, 0), 3),
    soft_skills_score = coalesce(nullif(soft_skills_score, 0), 3)
where true;

update public.handover_checklist
set cluster = case item
  when 'Distribuicao atual das carteiras' then 'Pessoas e responsabilidades'
  when 'Principais contratos criticos' then 'Contratos e fornecedores'
  when 'Principais fornecedores' then 'Contratos e fornecedores'
  when 'Stakeholders mais sensiveis' then 'Stakeholders'
  when 'Rotinas da area' then 'Governanca e rotinas'
  when 'Reunioes recorrentes' then 'Governanca e rotinas'
  when 'Pipeline de sourcing' then 'Sourcing e valor'
  when 'Oportunidades financeiras' then 'Gestao financeira da area'
  when 'Riscos atuais' then 'Riscos e governanca'
  when 'Performance de cada pessoa do time' then 'Pessoas'
  when 'Potenciais e sucessao' then 'Pessoas'
  when 'Pontos de atencao do time' then 'Pessoas'
  when 'Historico de decisoes relevantes' then 'Governanca e rotinas'
  when 'Temas pendentes de SAP/S4' then 'Tecnologia e SAP'
  when 'Quick wins ja mapeados' then 'Sourcing e valor'
  when 'Pontos politicos sensiveis' then 'Stakeholders'
  when 'Recomendacoes da Thais' then 'Transicao'
  else coalesce(nullif(cluster, ''), 'Governanca e rotinas')
end
where coalesce(cluster, '') = '';

create or replace function public.set_handover_cluster()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.cluster, '') = '' then
    new.cluster := case new.item
      when 'Distribuicao atual das carteiras' then 'Pessoas e responsabilidades'
      when 'Principais contratos criticos' then 'Contratos e fornecedores'
      when 'Principais fornecedores' then 'Contratos e fornecedores'
      when 'Stakeholders mais sensiveis' then 'Stakeholders'
      when 'Rotinas da area' then 'Governanca e rotinas'
      when 'Reunioes recorrentes' then 'Governanca e rotinas'
      when 'Pipeline de sourcing' then 'Sourcing e valor'
      when 'Oportunidades financeiras' then 'Gestao financeira da area'
      when 'Riscos atuais' then 'Riscos e governanca'
      when 'Performance de cada pessoa do time' then 'Pessoas'
      when 'Potenciais e sucessao' then 'Pessoas'
      when 'Pontos de atencao do time' then 'Pessoas'
      when 'Historico de decisoes relevantes' then 'Governanca e rotinas'
      when 'Temas pendentes de SAP/S4' then 'Tecnologia e SAP'
      when 'Quick wins ja mapeados' then 'Sourcing e valor'
      when 'Pontos politicos sensiveis' then 'Stakeholders'
      when 'Recomendacoes da Thais' then 'Transicao'
      else 'Governanca e rotinas'
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists set_handover_cluster_before_write on public.handover_checklist;
create trigger set_handover_cluster_before_write
  before insert or update on public.handover_checklist
  for each row execute function public.set_handover_cluster();

grant select, insert, update, delete on public.people to authenticated;
grant select, insert, update, delete on public.handover_checklist to authenticated;
