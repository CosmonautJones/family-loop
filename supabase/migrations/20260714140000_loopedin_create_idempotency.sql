create table if not exists loopedin_private.loopedin_event_create_operations (
  actor_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.loopedin_groups(id) on delete cascade,
  operation_key uuid not null,
  event_id uuid not null unique references public.loopedin_events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (actor_id, group_id, operation_key)
);

create table if not exists loopedin_private.loopedin_message_create_operations (
  actor_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.loopedin_events(id) on delete cascade,
  operation_key uuid not null,
  message_id uuid not null unique references public.loopedin_event_messages(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (actor_id, event_id, operation_key)
);

revoke all on loopedin_private.loopedin_event_create_operations from public, anon, authenticated;
revoke all on loopedin_private.loopedin_message_create_operations from public, anon, authenticated;

create or replace function public.loopedin_create_event(
  target_group_id uuid,
  target_title text,
  target_starts_at timestamptz,
  target_ends_at timestamptz,
  target_location text,
  target_description text,
  target_status_label text,
  target_visibility text,
  target_timeline jsonb,
  target_cover_url text,
  target_operation_key uuid
)
returns public.loopedin_events
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_actor_id uuid := auth.uid();
  created_event public.loopedin_events;
begin
  if current_actor_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  if target_operation_key is null then raise exception 'An operation key is required.' using errcode = '22023'; end if;
  perform 1
  from public.loopedin_group_members membership
  where membership.group_id = target_group_id and membership.user_id = current_actor_id
  for key share;
  if not found then raise exception 'Group access required.' using errcode = '42501'; end if;

  perform pg_advisory_xact_lock(hashtextextended('loopedin:event:' || current_actor_id::text || ':' || target_group_id::text || ':' || target_operation_key::text, 0));

  select event.* into created_event
  from loopedin_private.loopedin_event_create_operations operation
  join public.loopedin_events event on event.id = operation.event_id
  where operation.actor_id = current_actor_id
    and operation.group_id = target_group_id
    and operation.operation_key = target_operation_key;
  if created_event.id is not null then return created_event; end if;

  insert into public.loopedin_events (group_id, title, starts_at, ends_at, location, description, status_label, visibility, timeline, cover_url, created_by)
  values (target_group_id, btrim(target_title), target_starts_at, target_ends_at, coalesce(btrim(target_location), ''), coalesce(btrim(target_description), ''), target_status_label, target_visibility, target_timeline, target_cover_url, current_actor_id)
  returning * into created_event;

  insert into loopedin_private.loopedin_event_create_operations (actor_id, group_id, operation_key, event_id)
  values (current_actor_id, target_group_id, target_operation_key, created_event.id);
  return created_event;
end;
$$;

create or replace function public.loopedin_send_event_message(
  target_event_id uuid,
  target_body text,
  target_operation_key uuid
)
returns public.loopedin_event_messages
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_actor_id uuid := auth.uid();
  target_group_id uuid;
  created_message public.loopedin_event_messages;
begin
  if current_actor_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  if target_operation_key is null then raise exception 'An operation key is required.' using errcode = '22023'; end if;
  if nullif(btrim(target_body), '') is null then raise exception 'Write a message before sending.' using errcode = '22023'; end if;
  select event.group_id into target_group_id
  from public.loopedin_events event
  where event.id = target_event_id
  for key share;
  if target_group_id is null then raise exception 'Event access required.' using errcode = '42501'; end if;

  perform 1
  from public.loopedin_group_members membership
  where membership.group_id = target_group_id and membership.user_id = current_actor_id
  for key share;
  if not found then raise exception 'Event access required.' using errcode = '42501'; end if;

  perform pg_advisory_xact_lock(hashtextextended('loopedin:message:' || current_actor_id::text || ':' || target_event_id::text || ':' || target_operation_key::text, 0));

  select message.* into created_message
  from loopedin_private.loopedin_message_create_operations operation
  join public.loopedin_event_messages message on message.id = operation.message_id
  where operation.actor_id = current_actor_id
    and operation.event_id = target_event_id
    and operation.operation_key = target_operation_key;
  if created_message.id is not null then return created_message; end if;

  insert into public.loopedin_event_messages (event_id, author_id, body)
  values (target_event_id, current_actor_id, btrim(target_body))
  returning * into created_message;

  insert into loopedin_private.loopedin_message_create_operations (actor_id, event_id, operation_key, message_id)
  values (current_actor_id, target_event_id, target_operation_key, created_message.id);
  return created_message;
end;
$$;

revoke all on function public.loopedin_create_event(uuid, text, timestamptz, timestamptz, text, text, text, text, jsonb, text, uuid) from public;
revoke all on function public.loopedin_send_event_message(uuid, text, uuid) from public;
grant execute on function public.loopedin_create_event(uuid, text, timestamptz, timestamptz, text, text, text, text, jsonb, text, uuid) to authenticated;
grant execute on function public.loopedin_send_event_message(uuid, text, uuid) to authenticated;
