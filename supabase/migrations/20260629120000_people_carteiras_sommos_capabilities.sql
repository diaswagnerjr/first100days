alter table if exists public.people
  add column if not exists current_capabilities text not null default '',
  add column if not exists future_capabilities text not null default '',
  add column if not exists capability_gaps text not null default '',
  add column if not exists pdi_oriented text not null default '',
  add column if not exists capability_notes text not null default '';

update public.people
set current_capabilities = trim(both from concat_ws(E'\n\n', nullif(strengths, ''), nullif(hard_skills, ''), nullif(soft_skills, ''))),
    capability_gaps = trim(both from concat_ws(E'\n\n', nullif(attention_points, ''), nullif(risks, ''))),
    pdi_oriented = coalesce(nullif(development, ''), pdi_oriented),
    capability_notes = trim(both from concat_ws(E'\n\n', nullif(notes, ''), nullif(potential_notes, '')))
where current_capabilities = ''
   or capability_gaps = ''
   or pdi_oriented = ''
   or capability_notes = '';

with sommos_seed(person_name, role_name, sommos_value, sommos_score_value) as (
  values
    ('Bruna Ferreira', 'Analista Pl.', 'Dentro do esperado', 3),
    ('Denis', 'Analista Sr.', 'Dentro do esperado', 3),
    ('Denis Santana', 'Analista Sr.', 'Dentro do esperado', 3),
    ('Gabriel Menezes', 'Consultor I', 'Dentro do esperado', 3),
    ('Isabella da Silva', 'Estagiário', 'Dentro do esperado', 3),
    ('Isabella Maciel', 'Estagiário', 'Dentro do esperado', 3),
    ('João Victor', 'Analista Sr.', 'Acima do esperado', 4),
    ('Joao Victor', 'Analista Sr.', 'Acima do esperado', 4),
    ('Pedro Escobar', 'Analista Sr.', 'Acima do esperado', 4),
    ('Rafael Iury', 'Analista Pl.', 'Dentro do esperado', 3),
    ('Rafael Yuri', 'Analista Pl.', 'Dentro do esperado', 3),
    ('Rhenan Caetano', 'Analista Sr.', 'Acima do esperado', 4),
    ('Rhenan Morgado', 'Analista Sr.', 'Acima do esperado', 4),
    ('Thais Gois', 'Consultor I', 'Abaixo do esperado', 2)
)
update public.people p
set role = s.role_name,
    sommos = s.sommos_value,
    sommos_score = s.sommos_score_value
from sommos_seed s
where lower(p.name) = lower(s.person_name);

with checklist as (
  select p.id,
         coalesce(
           jsonb_agg(distinct mapped.item) filter (where mapped.item is not null),
           '[]'::jsonb
         ) as next_checklist
  from public.people p
  left join lateral jsonb_array_elements_text(coalesce(p.leadership_checklist, '[]'::jsonb)) current_item(value) on true
  left join lateral (
    select case
      when current_item.value in ('Temas Quentes', 'Temas Criticos', 'Temas Criticos / Temas Quentes') then 'Temas Criticos'
      when current_item.value = 'Metas Financeiras' then 'Metas'
      when current_item.value in (
        'Motivacao',
        'Metas',
        'Necessidades de Apoio',
        'Oportunidades Financeiras',
        'Alinhamento de Conversas com Stakeholders',
        'Alinhamento de Conversas com Fornecedores'
      ) then current_item.value
      else null
    end as item
  ) mapped on true
  group by p.id
)
update public.people p
set leadership_checklist = checklist.next_checklist
from checklist
where p.id = checklist.id;

with assignment(person_name, category_name) as (
  values
    ('Gabriel Menezes', 'FORNECIM ALIM-FLORT'),
    ('Gabriel Menezes', 'FORNECIM ALIM-INDL'),
    ('Gabriel Menezes', 'SERV DESPACHANTE'),
    ('Gabriel Menezes', 'SERV MAO OBRA TERC'),
    ('João Victor', 'FROTA LEVE'),
    ('João Victor', 'SERV LOC IMOVEL'),
    ('João Victor', 'SERV LOC VEICULO LEV'),
    ('João Victor', 'SERV VIG/MON CFTV'),
    ('Bruna Ferreira', 'SERV AGENC PROPAGAND'),
    ('Bruna Ferreira', 'SERV CARTAO BENEFIC'),
    ('Bruna Ferreira', 'SERV PESQ QUAL OPER'),
    ('Bruna Ferreira', 'SERV TRADE MARKETING'),
    ('Bruna Ferreira', 'SERV TRANSP MUDANCA'),
    ('Thais Gois', 'SERV CONTROLE PRAGAS'),
    ('Thais Gois', 'SERV JARDINAGEM'),
    ('Thais Gois', 'SERV LIMPEZA/VIGILANCIA'),
    ('Thais Gois', 'SERV LIMPEZA/VIGILANCIA CD'),
    ('Pedro Escobar', 'SERV FRET AEREO'),
    ('Pedro Escobar', 'SERV FRETAM FLORT'),
    ('Pedro Escobar', 'SERV FRETAM INDL'),
    ('Pedro Escobar', 'SERV TAXI'),
    ('Pedro Escobar', 'TRANSP ALIMENTAÇAO'),
    ('Denis', 'SERV CONS TECN'),
    ('Denis', 'SERV CONS TI'),
    ('Denis', 'SERV GERENC SERVIDOR'),
    ('Denis', 'SERV LIC DIREIT C/TI'),
    ('Denis', 'SERV LIC DIREIT S/TI'),
    ('Denis', 'SERV LINK DADOS SAT'),
    ('Denis', 'SERV MOVEL ESP RADIO'),
    ('Denis', 'SERV TELEMETRIA'),
    ('Denis', 'SERV TI-SUPORTE TECN'),
    ('Denis Santana', 'SERV CONS TECN'),
    ('Denis Santana', 'SERV CONS TI'),
    ('Denis Santana', 'SERV GERENC SERVIDOR'),
    ('Denis Santana', 'SERV LIC DIREIT C/TI'),
    ('Denis Santana', 'SERV LIC DIREIT S/TI'),
    ('Denis Santana', 'SERV LINK DADOS SAT'),
    ('Denis Santana', 'SERV MOVEL ESP RADIO'),
    ('Denis Santana', 'SERV TELEMETRIA'),
    ('Denis Santana', 'SERV TI-SUPORTE TECN'),
    ('Rafael Iury', 'Hardware/Compra de equipamento'),
    ('Rafael Iury', 'SERV CONS TECN'),
    ('Rafael Iury', 'SERV CONS TI'),
    ('Rafael Iury', 'SERV GERENC SERVIDOR'),
    ('Rafael Iury', 'SERV LIC DIREIT C/TI'),
    ('Rafael Iury', 'SERV LIC DIREIT S/TI'),
    ('Rafael Iury', 'SERV LOC EQUIP INFOR'),
    ('Rafael Iury', 'SERV OUTSOURC IMPRES'),
    ('Rafael Iury', 'SERV SIST AUTOMAC TI'),
    ('Rafael Iury', 'SERV TI-SUPORTE TECN'),
    ('Rafael Yuri', 'Hardware/Compra de equipamento'),
    ('Rafael Yuri', 'SERV CONS TECN'),
    ('Rafael Yuri', 'SERV CONS TI'),
    ('Rafael Yuri', 'SERV GERENC SERVIDOR'),
    ('Rafael Yuri', 'SERV LIC DIREIT C/TI'),
    ('Rafael Yuri', 'SERV LIC DIREIT S/TI'),
    ('Rafael Yuri', 'SERV LOC EQUIP INFOR'),
    ('Rafael Yuri', 'SERV OUTSOURC IMPRES'),
    ('Rafael Yuri', 'SERV SIST AUTOMAC TI'),
    ('Rafael Yuri', 'SERV TI-SUPORTE TECN'),
    ('Rhenan Caetano', 'SERV CONS TECN'),
    ('Rhenan Caetano', 'SERV CONS TI'),
    ('Rhenan Caetano', 'SERV GERENC SERVIDOR'),
    ('Rhenan Caetano', 'SERV LIC DIREIT C/TI'),
    ('Rhenan Caetano', 'SERV LIC DIREIT S/TI'),
    ('Rhenan Caetano', 'SERV LIC DIREIT SAP'),
    ('Rhenan Caetano', 'SERV TI-SUPORTE TECN'),
    ('Rhenan Morgado', 'SERV CONS TECN'),
    ('Rhenan Morgado', 'SERV CONS TI'),
    ('Rhenan Morgado', 'SERV GERENC SERVIDOR'),
    ('Rhenan Morgado', 'SERV LIC DIREIT C/TI'),
    ('Rhenan Morgado', 'SERV LIC DIREIT S/TI'),
    ('Rhenan Morgado', 'SERV LIC DIREIT SAP'),
    ('Rhenan Morgado', 'SERV TI-SUPORTE TECN')
),
matched as (
  select p.id as person_id, c.id::text as category_id
  from public.people p
  join assignment a on lower(p.name) = lower(a.person_name)
  join public.categories c on c.user_id = p.user_id and lower(c.name) = lower(a.category_name)
),
merged as (
  select p.id,
         jsonb_agg(distinct all_ids.category_id order by all_ids.category_id) as next_category_ids
  from public.people p
  join matched m on m.person_id = p.id
  left join lateral jsonb_array_elements_text(coalesce(p.category_ids, '[]'::jsonb)) existing(category_id) on true
  cross join lateral (
    select existing.category_id
    where existing.category_id is not null
      and exists (
        select 1
        from public.categories existing_category
        where existing_category.user_id = p.user_id
          and existing_category.id::text = existing.category_id
      )
    union
    select category_id from matched where person_id = p.id
  ) all_ids
  group by p.id
)
update public.people p
set category_ids = merged.next_category_ids
from merged
where p.id = merged.id;

update public.people p
set portfolios = coalesce(portfolio_names.names, '')
from (
  select p.id,
         string_agg(c.name, ', ' order by c.spend desc, c.name) as names
  from public.people p
  join lateral jsonb_array_elements_text(coalesce(p.category_ids, '[]'::jsonb)) category_id(value) on true
  join public.categories c on c.user_id = p.user_id and c.id::text = category_id.value
  group by p.id
) portfolio_names
where p.id = portfolio_names.id;
