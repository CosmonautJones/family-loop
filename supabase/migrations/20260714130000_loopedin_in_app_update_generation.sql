create or replace function loopedin_private.notify_current_group_members(
  target_group_id uuid,
  target_event_id uuid,
  actor_id uuid,
  notification_kind text,
  notification_title text,
  notification_body text
)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  insert into public.loopedin_notifications (user_id, kind, title, body, event_id, group_id)
  select member.user_id, notification_kind, notification_title, notification_body, target_event_id, target_group_id
  from public.loopedin_group_members member
  where member.group_id = target_group_id
    and actor_id is not null
    and member.user_id <> actor_id;
$$;

create or replace function loopedin_private.notify_event_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare actor_id uuid;
begin
  if tg_op = 'INSERT' then
    actor_id := new.created_by;
    perform loopedin_private.notify_current_group_members(
      new.group_id, new.id, actor_id, 'event_update', 'New family plan', 'A family plan was added.'
    );
    return new;
  end if;
  if row(new.title, new.starts_at, new.ends_at, new.location, new.description, new.status_label, new.timeline, new.cover_url)
     is not distinct from
     row(old.title, old.starts_at, old.ends_at, old.location, old.description, old.status_label, old.timeline, old.cover_url) then
    return new;
  end if;
  actor_id := auth.uid();
  perform loopedin_private.notify_current_group_members(
    new.group_id, new.id, actor_id, 'event_update', 'Family plan updated', 'A family plan was updated.'
  );
  return new;
end;
$$;

create or replace function loopedin_private.notify_rsvp_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare target_group_id uuid;
begin
  if tg_op = 'UPDATE'
     and row(new.status, new.note) is not distinct from row(old.status, old.note) then
    return new;
  end if;
  select event.group_id into target_group_id from public.loopedin_events event where event.id = new.event_id;
  perform loopedin_private.notify_current_group_members(
    target_group_id, new.event_id, new.user_id, 'rsvp', 'RSVP updated', 'Someone responded to a family plan.'
  );
  return new;
end;
$$;

create or replace function loopedin_private.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare target_group_id uuid;
begin
  select event.group_id into target_group_id from public.loopedin_events event where event.id = new.event_id;
  perform loopedin_private.notify_current_group_members(
    target_group_id, new.event_id, new.author_id, 'message', 'New family comment', 'Someone commented on a family plan.'
  );
  return new;
end;
$$;

create or replace function loopedin_private.notify_activated_media()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare target_group_id uuid;
declare actor_id uuid := auth.uid();
begin
  if old.status <> 'pending' or new.status <> 'active' then return new; end if;
  select event.group_id into target_group_id from public.loopedin_events event where event.id = new.event_id;
  perform loopedin_private.notify_current_group_members(
    target_group_id, new.event_id, actor_id, 'media', 'New family photo', 'A photo was shared with the family.'
  );
  return new;
end;
$$;

drop trigger if exists loopedin_events_notify_change on public.loopedin_events;
create trigger loopedin_events_notify_change
after insert or update on public.loopedin_events
for each row execute function loopedin_private.notify_event_change();

drop trigger if exists loopedin_rsvps_notify_change on public.loopedin_rsvps;
create trigger loopedin_rsvps_notify_change
after insert or update on public.loopedin_rsvps
for each row execute function loopedin_private.notify_rsvp_change();

drop trigger if exists loopedin_messages_notify_insert on public.loopedin_event_messages;
create trigger loopedin_messages_notify_insert
after insert on public.loopedin_event_messages
for each row execute function loopedin_private.notify_new_message();

drop trigger if exists loopedin_media_notify_activation on public.loopedin_event_media;
create trigger loopedin_media_notify_activation
after update on public.loopedin_event_media
for each row execute function loopedin_private.notify_activated_media();

revoke all on function loopedin_private.notify_current_group_members(uuid, uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function loopedin_private.notify_event_change() from public, anon, authenticated;
revoke all on function loopedin_private.notify_rsvp_change() from public, anon, authenticated;
revoke all on function loopedin_private.notify_new_message() from public, anon, authenticated;
revoke all on function loopedin_private.notify_activated_media() from public, anon, authenticated;
