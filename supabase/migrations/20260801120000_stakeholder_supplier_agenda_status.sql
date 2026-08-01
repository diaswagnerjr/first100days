alter table public.stakeholders
  add column if not exists agenda_scheduled boolean not null default false,
  add column if not exists agenda_date date,
  add column if not exists conversation_done boolean not null default false;

alter table public.suppliers
  add column if not exists agenda_scheduled boolean not null default false,
  add column if not exists agenda_date date,
  add column if not exists conversation_done boolean not null default false,
  add column if not exists contact_role text not null default '';

update public.stakeholders
set
  agenda_date = coalesce(agenda_date, next_conversation),
  agenda_scheduled = agenda_scheduled or next_conversation is not null,
  conversation_done = conversation_done or conversation_date is not null or first_conversation is not null
where agenda_date is null
   or agenda_scheduled = false
   or conversation_done = false;

update public.suppliers
set
  agenda_date = coalesce(agenda_date, next_interaction),
  agenda_scheduled = agenda_scheduled or next_interaction is not null,
  conversation_done = conversation_done or conversation_date is not null or first_interaction is not null
where agenda_date is null
   or agenda_scheduled = false
   or conversation_done = false;

create index if not exists stakeholders_user_id_agenda_status_idx
  on public.stakeholders (user_id, show_on_dashboard, agenda_scheduled, conversation_done);

create index if not exists suppliers_user_id_agenda_status_idx
  on public.suppliers (user_id, show_on_dashboard, agenda_scheduled, conversation_done);

grant select, insert, update, delete on public.stakeholders to authenticated;
grant select, insert, update, delete on public.suppliers to authenticated;
