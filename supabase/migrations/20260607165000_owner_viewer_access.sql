create schema if not exists app_private;

create or replace function app_private.current_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function app_private.owner_user_id()
returns uuid
language sql
stable
security definer
set search_path = auth, public
as $$
  select id
  from auth.users
  where lower(email) = 'diaswagnerjr@gmail.com'
  order by created_at
  limit 1;
$$;

create or replace function app_private.can_read_first100days(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = auth, public
as $$
  select
    (app_private.current_email() = 'diaswagnerjr@gmail.com' and target_user = auth.uid())
    or
    (app_private.current_email() = 'wagnerdj@suzano.com.br' and target_user = app_private.owner_user_id());
$$;

create or replace function app_private.can_write_first100days(target_user uuid)
returns boolean
language sql
stable
as $$
  select app_private.current_email() = 'diaswagnerjr@gmail.com' and target_user = auth.uid();
$$;

do $$
declare
  target_table text;
  policy_name text;
begin
  foreach target_table in array array[
    'people',
    'stakeholders',
    'suppliers',
    'categories',
    'diagnosis',
    'methodology_pillars',
    'pillar_decisions',
    'handover_checklist',
    'org_scenarios',
    'org_scenario_items',
    'meetings',
    'reminders',
    'user_preferences'
  ]
  loop
    execute format('alter table public.%I enable row level security', target_table);

    for policy_name in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
    loop
      execute format('drop policy if exists %I on public.%I', policy_name, target_table);
    end loop;

    execute format('create policy %I on public.%I for select to authenticated using (app_private.can_read_first100days(user_id))', target_table || '_owner_viewer_select', target_table);
    execute format('create policy %I on public.%I for insert to authenticated with check (app_private.can_write_first100days(user_id))', target_table || '_owner_insert', target_table);
    execute format('create policy %I on public.%I for update to authenticated using (app_private.can_write_first100days(user_id)) with check (app_private.can_write_first100days(user_id))', target_table || '_owner_update', target_table);
    execute format('create policy %I on public.%I for delete to authenticated using (app_private.can_write_first100days(user_id))', target_table || '_owner_delete', target_table);
  end loop;
end;
$$;

drop policy if exists "Profiles are editable by owner" on public.profiles;
drop policy if exists profiles_owner_viewer_select on public.profiles;
drop policy if exists profiles_owner_update on public.profiles;

create policy profiles_owner_viewer_select
  on public.profiles
  for select
  to authenticated
  using (
    (app_private.current_email() = 'diaswagnerjr@gmail.com' and id = auth.uid())
    or
    (app_private.current_email() = 'wagnerdj@suzano.com.br' and id = app_private.owner_user_id())
  );

create policy profiles_owner_update
  on public.profiles
  for all
  to authenticated
  using (app_private.current_email() = 'diaswagnerjr@gmail.com' and id = auth.uid())
  with check (app_private.current_email() = 'diaswagnerjr@gmail.com' and id = auth.uid());

grant usage on schema app_private to authenticated;
grant execute on function app_private.current_email() to authenticated;
grant execute on function app_private.owner_user_id() to authenticated;
grant execute on function app_private.can_read_first100days(uuid) to authenticated;
grant execute on function app_private.can_write_first100days(uuid) to authenticated;

create or replace function app_private.restrict_first100days_auth_users()
returns trigger
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  if lower(new.email) not in ('diaswagnerjr@gmail.com', 'wagnerdj@suzano.com.br') then
    raise exception 'First100Days access is restricted to authorized users.';
  end if;
  return new;
end;
$$;

drop trigger if exists restrict_first100days_auth_users_before_insert on auth.users;
create trigger restrict_first100days_auth_users_before_insert
  before insert on auth.users
  for each row execute function app_private.restrict_first100days_auth_users();
