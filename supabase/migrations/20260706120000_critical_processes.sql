create table if not exists public.critical_processes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  category_ids jsonb not null default '[]'::jsonb,
  handover_date date,
  description text not null default '',
  scrum_actions text not null default '',
  notes text not null default '',
  scrum_actions_done boolean not null default false,
  show_on_dashboard boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists critical_processes_user_id_done_idx on public.critical_processes(user_id, scrum_actions_done);
create index if not exists critical_processes_user_id_dashboard_idx on public.critical_processes(user_id, show_on_dashboard);

drop trigger if exists touch_critical_processes_updated_at on public.critical_processes;
create trigger touch_critical_processes_updated_at
  before update on public.critical_processes
  for each row execute function public.touch_updated_at();

alter table public.critical_processes enable row level security;

drop policy if exists critical_processes_owner_viewer_select on public.critical_processes;
drop policy if exists critical_processes_owner_insert on public.critical_processes;
drop policy if exists critical_processes_owner_update on public.critical_processes;
drop policy if exists critical_processes_owner_delete on public.critical_processes;

create policy critical_processes_owner_viewer_select on public.critical_processes
  for select to authenticated using (app_private.can_read_first100days(user_id));

create policy critical_processes_owner_insert on public.critical_processes
  for insert to authenticated with check (app_private.can_write_first100days(user_id));

create policy critical_processes_owner_update on public.critical_processes
  for update to authenticated using (app_private.can_write_first100days(user_id))
  with check (app_private.can_write_first100days(user_id));

create policy critical_processes_owner_delete on public.critical_processes
  for delete to authenticated using (app_private.can_write_first100days(user_id));

grant select, insert, update, delete on public.critical_processes to authenticated;

insert into public.critical_processes (user_id, name, show_on_dashboard)
select owner.id, seed.name, true
from auth.users owner
cross join (values
  ('Estrategia Google'),
  ('Negociacao Radio'),
  ('Incendio CD Aruja BC + Multa Movida/ LM'),
  ('Gocil'),
  ('Consultorias (Delegacao - Subcategorizacao) + Descentralizacao/ Delegacao'),
  ('BID Limpeza'),
  ('BID - Alimentacao'),
  ('JSL - Jacarei')
) as seed(name)
where lower(owner.email) = 'diaswagnerjr@gmail.com'
  and not exists (
    select 1
    from public.critical_processes existing
    where existing.user_id = owner.id
      and lower(existing.name) = lower(seed.name)
  );
