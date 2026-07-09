alter table public.suppliers
  add column if not exists show_on_dashboard boolean not null default false;

alter table public.stakeholders
  add column if not exists show_on_dashboard boolean not null default false;

create index if not exists suppliers_user_id_show_on_dashboard_idx
  on public.suppliers (user_id, show_on_dashboard);

create index if not exists stakeholders_user_id_show_on_dashboard_idx
  on public.stakeholders (user_id, show_on_dashboard);

update public.handover_checklist
set section = 'administrativo'
where section is distinct from 'administrativo';

grant select, insert, update, delete on public.suppliers to authenticated;
grant select, insert, update, delete on public.stakeholders to authenticated;
grant select, insert, update, delete on public.handover_checklist to authenticated;
