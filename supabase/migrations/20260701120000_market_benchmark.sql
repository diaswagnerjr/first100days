create table if not exists public.market_benchmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null default '',
  contact_name text not null default '',
  contact_role text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  conversation_date date,
  status text not null default 'Nao iniciado' check (status in ('Nao iniciado', 'Agendado', 'Em andamento', 'Concluido')),
  scope_area text not null default '',
  managed_spend text not null default '',
  org_structure text not null default '',
  category_classification text not null default '',
  roles_responsibilities text not null default '',
  contract_management text not null default '',
  service_model text not null default '',
  governance text not null default '',
  kpis text not null default '',
  digital_analytics text not null default '',
  strategic_agenda text not null default '',
  learnings text not null default '',
  next_steps text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, company_name)
);

create index if not exists market_benchmarks_user_id_status_idx on public.market_benchmarks(user_id, status);

drop trigger if exists touch_market_benchmarks_updated_at on public.market_benchmarks;
create trigger touch_market_benchmarks_updated_at
  before update on public.market_benchmarks
  for each row execute function public.touch_updated_at();

alter table public.market_benchmarks enable row level security;

drop policy if exists market_benchmarks_owner_viewer_select on public.market_benchmarks;
drop policy if exists market_benchmarks_owner_insert on public.market_benchmarks;
drop policy if exists market_benchmarks_owner_update on public.market_benchmarks;
drop policy if exists market_benchmarks_owner_delete on public.market_benchmarks;

create policy market_benchmarks_owner_viewer_select on public.market_benchmarks
  for select to authenticated using (app_private.can_read_first100days(user_id));

create policy market_benchmarks_owner_insert on public.market_benchmarks
  for insert to authenticated with check (app_private.can_write_first100days(user_id));

create policy market_benchmarks_owner_update on public.market_benchmarks
  for update to authenticated using (app_private.can_write_first100days(user_id))
  with check (app_private.can_write_first100days(user_id));

create policy market_benchmarks_owner_delete on public.market_benchmarks
  for delete to authenticated using (app_private.can_write_first100days(user_id));

grant select, insert, update, delete on public.market_benchmarks to authenticated;

insert into public.market_benchmarks (user_id, company_name, status)
select owner.id, seed.company_name, 'Nao iniciado'
from auth.users owner
cross join (values
  ('Empresa 1'),
  ('Empresa 2'),
  ('Empresa 3'),
  ('Empresa 4'),
  ('Empresa 5')
) as seed(company_name)
where lower(owner.email) = 'diaswagnerjr@gmail.com'
  and not exists (
    select 1
    from public.market_benchmarks existing
    where existing.user_id = owner.id
      and lower(existing.company_name) = lower(seed.company_name)
  );
