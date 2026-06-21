create table if not exists public.coaching_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_number integer not null check (session_number between 1 and 6),
  session_date date,
  topics text not null default '',
  insights text not null default '',
  agreed_actions text not null default '',
  action_status text not null default 'Aberta' check (action_status in ('Aberta', 'Em andamento', 'Concluida')),
  prep_themes text not null default '',
  prep_doubts text not null default '',
  prep_challenges text not null default '',
  prep_situations text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, session_number)
);

create table if not exists public.client_routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area text not null check (area in ('Tecnologia', 'Facilities / SSQV', 'Marketing', 'Rotinas Internas', 'Outras')),
  name text not null,
  objective text not null default '',
  frequency text not null default '',
  current_owner text not null default '',
  participants text not null default '',
  status text not null default 'Ativa' check (status in ('Ativa', 'Revisar', 'Descontinuar')),
  perceptions text not null default '',
  improvements text not null default '',
  future_adjustments text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coaching_sessions_user_id_idx on public.coaching_sessions(user_id);
create index if not exists client_routines_user_id_area_idx on public.client_routines(user_id, area);

drop trigger if exists touch_coaching_sessions_updated_at on public.coaching_sessions;
create trigger touch_coaching_sessions_updated_at
  before update on public.coaching_sessions
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_client_routines_updated_at on public.client_routines;
create trigger touch_client_routines_updated_at
  before update on public.client_routines
  for each row execute function public.touch_updated_at();

alter table public.coaching_sessions enable row level security;
alter table public.client_routines enable row level security;

drop policy if exists coaching_sessions_owner_viewer_select on public.coaching_sessions;
drop policy if exists coaching_sessions_owner_insert on public.coaching_sessions;
drop policy if exists coaching_sessions_owner_update on public.coaching_sessions;
drop policy if exists coaching_sessions_owner_delete on public.coaching_sessions;

create policy coaching_sessions_owner_viewer_select on public.coaching_sessions
  for select to authenticated using (app_private.can_read_first100days(user_id));
create policy coaching_sessions_owner_insert on public.coaching_sessions
  for insert to authenticated with check (app_private.can_write_first100days(user_id));
create policy coaching_sessions_owner_update on public.coaching_sessions
  for update to authenticated using (app_private.can_write_first100days(user_id))
  with check (app_private.can_write_first100days(user_id));
create policy coaching_sessions_owner_delete on public.coaching_sessions
  for delete to authenticated using (app_private.can_write_first100days(user_id));

drop policy if exists client_routines_owner_viewer_select on public.client_routines;
drop policy if exists client_routines_owner_insert on public.client_routines;
drop policy if exists client_routines_owner_update on public.client_routines;
drop policy if exists client_routines_owner_delete on public.client_routines;

create policy client_routines_owner_viewer_select on public.client_routines
  for select to authenticated using (app_private.can_read_first100days(user_id));
create policy client_routines_owner_insert on public.client_routines
  for insert to authenticated with check (app_private.can_write_first100days(user_id));
create policy client_routines_owner_update on public.client_routines
  for update to authenticated using (app_private.can_write_first100days(user_id))
  with check (app_private.can_write_first100days(user_id));
create policy client_routines_owner_delete on public.client_routines
  for delete to authenticated using (app_private.can_write_first100days(user_id));

grant select, insert, update, delete on public.coaching_sessions to authenticated;
grant select, insert, update, delete on public.client_routines to authenticated;

insert into public.coaching_sessions (user_id, session_number)
select owner.id, sessions.session_number
from auth.users owner
cross join generate_series(1, 6) as sessions(session_number)
where lower(owner.email) = 'diaswagnerjr@gmail.com'
on conflict (user_id, session_number) do nothing;

insert into public.handover_checklist (user_id, item, status, owner, cluster)
select owner.id, seed.item, 'Nao iniciado', 'Wagner / Thais', seed.cluster
from auth.users owner
cross join (values
  ('Acessos e cartoes corporativos', 'Acessos e onboarding'),
  ('Programa de estagio e sua conducao', 'Pessoas')
) as seed(item, cluster)
where lower(owner.email) = 'diaswagnerjr@gmail.com'
  and not exists (
    select 1
    from public.handover_checklist existing
    where existing.user_id = owner.id
      and lower(existing.item) = lower(seed.item)
  );
