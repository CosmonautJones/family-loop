create extension if not exists pgcrypto;

create schema if not exists loopedin_private;
revoke all on schema loopedin_private from public;

create table if not exists public.loopedin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loopedin_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  kind text not null check (kind in ('family', 'friends')),
  cover_url text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loopedin_group_members (
  group_id uuid not null references public.loopedin_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.loopedin_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.loopedin_groups(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text not null default '',
  description text not null default '',
  status_label text not null default 'Open',
  visibility text not null default 'group' check (visibility = 'group'),
  timeline jsonb not null default '[]'::jsonb,
  cover_url text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at >= starts_at)
);

create table if not exists public.loopedin_rsvps (
  event_id uuid not null references public.loopedin_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  person_name text not null,
  status text not null check (status in ('going', 'maybe', 'declined')),
  note text,
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table if not exists public.loopedin_event_messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.loopedin_events(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) <= 4000),
  created_at timestamptz not null default now()
);

create table if not exists public.loopedin_event_media (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.loopedin_events(id) on delete cascade,
  storage_path text not null unique,
  caption text,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.loopedin_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('rsvp', 'message', 'media', 'reminder', 'event_update')),
  title text not null,
  body text not null,
  event_id uuid references public.loopedin_events(id) on delete cascade,
  group_id uuid references public.loopedin_groups(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.loopedin_reminder_drafts (
  event_id uuid not null references public.loopedin_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  remind_at timestamptz,
  body text not null default 'Morning-of reminder',
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create or replace function loopedin_private.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists loopedin_profiles_set_updated_at on public.loopedin_profiles;
create trigger loopedin_profiles_set_updated_at
before update on public.loopedin_profiles
for each row execute function loopedin_private.set_updated_at();

drop trigger if exists loopedin_groups_set_updated_at on public.loopedin_groups;
create trigger loopedin_groups_set_updated_at
before update on public.loopedin_groups
for each row execute function loopedin_private.set_updated_at();

drop trigger if exists loopedin_events_set_updated_at on public.loopedin_events;
create trigger loopedin_events_set_updated_at
before update on public.loopedin_events
for each row execute function loopedin_private.set_updated_at();

drop trigger if exists loopedin_rsvps_set_updated_at on public.loopedin_rsvps;
create trigger loopedin_rsvps_set_updated_at
before update on public.loopedin_rsvps
for each row execute function loopedin_private.set_updated_at();

drop trigger if exists loopedin_reminders_set_updated_at on public.loopedin_reminder_drafts;
create trigger loopedin_reminders_set_updated_at
before update on public.loopedin_reminder_drafts
for each row execute function loopedin_private.set_updated_at();

create or replace function loopedin_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.loopedin_profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Family member'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists loopedin_auth_user_created on auth.users;
create trigger loopedin_auth_user_created
after insert on auth.users
for each row execute function loopedin_private.handle_new_user();

create or replace function loopedin_private.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.loopedin_group_members member
    where member.group_id = target_group_id
      and member.user_id = (select auth.uid())
  );
$$;

create or replace function loopedin_private.can_manage_group(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.loopedin_group_members member
    where member.group_id = target_group_id
      and member.user_id = (select auth.uid())
      and member.role in ('owner', 'admin')
  );
$$;

create or replace function loopedin_private.is_event_member(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.loopedin_events event
    join public.loopedin_group_members member on member.group_id = event.group_id
    where event.id = target_event_id
      and member.user_id = (select auth.uid())
  );
$$;

create or replace function loopedin_private.storage_event_id(object_name text)
returns uuid
language plpgsql
stable
set search_path = public
as $$
declare
  parsed uuid;
begin
  begin
    parsed := split_part(object_name, '/', 1)::uuid;
  exception when others then
    parsed := null;
  end;
  return parsed;
end;
$$;

revoke all on function loopedin_private.handle_new_user() from public;
revoke all on function loopedin_private.is_group_member(uuid) from public;
revoke all on function loopedin_private.can_manage_group(uuid) from public;
revoke all on function loopedin_private.is_event_member(uuid) from public;
revoke all on function loopedin_private.storage_event_id(text) from public;

grant usage on schema loopedin_private to authenticated;
grant execute on function loopedin_private.is_group_member(uuid) to authenticated;
grant execute on function loopedin_private.can_manage_group(uuid) to authenticated;
grant execute on function loopedin_private.is_event_member(uuid) to authenticated;
grant execute on function loopedin_private.storage_event_id(text) to authenticated;

alter table public.loopedin_profiles enable row level security;
alter table public.loopedin_groups enable row level security;
alter table public.loopedin_group_members enable row level security;
alter table public.loopedin_events enable row level security;
alter table public.loopedin_rsvps enable row level security;
alter table public.loopedin_event_messages enable row level security;
alter table public.loopedin_event_media enable row level security;
alter table public.loopedin_notifications enable row level security;
alter table public.loopedin_reminder_drafts enable row level security;

revoke all on
  public.loopedin_profiles,
  public.loopedin_groups,
  public.loopedin_group_members,
  public.loopedin_events,
  public.loopedin_rsvps,
  public.loopedin_event_messages,
  public.loopedin_event_media,
  public.loopedin_notifications,
  public.loopedin_reminder_drafts
from anon;

drop policy if exists "profiles_select_related" on public.loopedin_profiles;
create policy "profiles_select_related" on public.loopedin_profiles
for select to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.loopedin_group_members mine
    join public.loopedin_group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = loopedin_profiles.id
  )
);

drop policy if exists "profiles_insert_self" on public.loopedin_profiles;
create policy "profiles_insert_self" on public.loopedin_profiles
for insert to authenticated
with check (id = (select auth.uid()));

drop policy if exists "profiles_update_self" on public.loopedin_profiles;
create policy "profiles_update_self" on public.loopedin_profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "groups_select_member_or_creator" on public.loopedin_groups;
create policy "groups_select_member_or_creator" on public.loopedin_groups
for select to authenticated
using (created_by = (select auth.uid()) or loopedin_private.is_group_member(id));

drop policy if exists "groups_insert_creator" on public.loopedin_groups;
create policy "groups_insert_creator" on public.loopedin_groups
for insert to authenticated
with check (created_by = (select auth.uid()));

drop policy if exists "groups_update_manager" on public.loopedin_groups;
create policy "groups_update_manager" on public.loopedin_groups
for update to authenticated
using (loopedin_private.can_manage_group(id))
with check (loopedin_private.can_manage_group(id));

drop policy if exists "groups_delete_owner" on public.loopedin_groups;
create policy "groups_delete_owner" on public.loopedin_groups
for delete to authenticated
using (
  exists (
    select 1 from public.loopedin_group_members member
    where member.group_id = loopedin_groups.id
      and member.user_id = (select auth.uid())
      and member.role = 'owner'
  )
);

drop policy if exists "members_select_member" on public.loopedin_group_members;
create policy "members_select_member" on public.loopedin_group_members
for select to authenticated
using (loopedin_private.is_group_member(group_id));

drop policy if exists "members_insert_creator_or_manager" on public.loopedin_group_members;
create policy "members_insert_creator_or_manager" on public.loopedin_group_members
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (
    exists (
      select 1 from public.loopedin_groups grp
      where grp.id = group_id and grp.created_by = (select auth.uid())
    )
    or loopedin_private.can_manage_group(group_id)
  )
);

drop policy if exists "members_update_manager" on public.loopedin_group_members;
create policy "members_update_manager" on public.loopedin_group_members
for update to authenticated
using (loopedin_private.can_manage_group(group_id))
with check (loopedin_private.can_manage_group(group_id));

drop policy if exists "members_delete_manager_or_self" on public.loopedin_group_members;
create policy "members_delete_manager_or_self" on public.loopedin_group_members
for delete to authenticated
using (user_id = (select auth.uid()) or loopedin_private.can_manage_group(group_id));

drop policy if exists "events_select_member" on public.loopedin_events;
create policy "events_select_member" on public.loopedin_events
for select to authenticated
using (loopedin_private.is_group_member(group_id));

drop policy if exists "events_insert_member" on public.loopedin_events;
create policy "events_insert_member" on public.loopedin_events
for insert to authenticated
with check (created_by = (select auth.uid()) and loopedin_private.is_group_member(group_id));

drop policy if exists "events_update_manager_or_creator" on public.loopedin_events;
create policy "events_update_manager_or_creator" on public.loopedin_events
for update to authenticated
using (created_by = (select auth.uid()) or loopedin_private.can_manage_group(group_id))
with check (created_by = (select auth.uid()) or loopedin_private.can_manage_group(group_id));

drop policy if exists "events_delete_manager_or_creator" on public.loopedin_events;
create policy "events_delete_manager_or_creator" on public.loopedin_events
for delete to authenticated
using (created_by = (select auth.uid()) or loopedin_private.can_manage_group(group_id));

drop policy if exists "rsvps_select_event_member" on public.loopedin_rsvps;
create policy "rsvps_select_event_member" on public.loopedin_rsvps
for select to authenticated
using (loopedin_private.is_event_member(event_id));

drop policy if exists "rsvps_insert_self" on public.loopedin_rsvps;
create policy "rsvps_insert_self" on public.loopedin_rsvps
for insert to authenticated
with check (user_id = (select auth.uid()) and loopedin_private.is_event_member(event_id));

drop policy if exists "rsvps_update_self" on public.loopedin_rsvps;
create policy "rsvps_update_self" on public.loopedin_rsvps
for update to authenticated
using (user_id = (select auth.uid()) and loopedin_private.is_event_member(event_id))
with check (user_id = (select auth.uid()) and loopedin_private.is_event_member(event_id));

drop policy if exists "rsvps_delete_self" on public.loopedin_rsvps;
create policy "rsvps_delete_self" on public.loopedin_rsvps
for delete to authenticated
using (user_id = (select auth.uid()) and loopedin_private.is_event_member(event_id));

drop policy if exists "messages_select_event_member" on public.loopedin_event_messages;
create policy "messages_select_event_member" on public.loopedin_event_messages
for select to authenticated
using (loopedin_private.is_event_member(event_id));

drop policy if exists "messages_insert_self" on public.loopedin_event_messages;
create policy "messages_insert_self" on public.loopedin_event_messages
for insert to authenticated
with check (author_id = (select auth.uid()) and loopedin_private.is_event_member(event_id));

drop policy if exists "media_select_event_member" on public.loopedin_event_media;
create policy "media_select_event_member" on public.loopedin_event_media
for select to authenticated
using (loopedin_private.is_event_member(event_id));

drop policy if exists "media_insert_self" on public.loopedin_event_media;
create policy "media_insert_self" on public.loopedin_event_media
for insert to authenticated
with check (uploaded_by = (select auth.uid()) and loopedin_private.is_event_member(event_id));

drop policy if exists "media_delete_uploader_or_manager" on public.loopedin_event_media;
create policy "media_delete_uploader_or_manager" on public.loopedin_event_media
for delete to authenticated
using (
  uploaded_by = (select auth.uid())
  or exists (
    select 1 from public.loopedin_events event
    where event.id = loopedin_event_media.event_id
      and loopedin_private.can_manage_group(event.group_id)
  )
);

drop policy if exists "notifications_select_self" on public.loopedin_notifications;
create policy "notifications_select_self" on public.loopedin_notifications
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "notifications_update_self" on public.loopedin_notifications;
create policy "notifications_update_self" on public.loopedin_notifications
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "reminders_select_self" on public.loopedin_reminder_drafts;
create policy "reminders_select_self" on public.loopedin_reminder_drafts
for select to authenticated
using (user_id = (select auth.uid()) and loopedin_private.is_event_member(event_id));

drop policy if exists "reminders_insert_self" on public.loopedin_reminder_drafts;
create policy "reminders_insert_self" on public.loopedin_reminder_drafts
for insert to authenticated
with check (user_id = (select auth.uid()) and loopedin_private.is_event_member(event_id));

drop policy if exists "reminders_update_self" on public.loopedin_reminder_drafts;
create policy "reminders_update_self" on public.loopedin_reminder_drafts
for update to authenticated
using (user_id = (select auth.uid()) and loopedin_private.is_event_member(event_id))
with check (user_id = (select auth.uid()) and loopedin_private.is_event_member(event_id));

drop policy if exists "reminders_delete_self" on public.loopedin_reminder_drafts;
create policy "reminders_delete_self" on public.loopedin_reminder_drafts
for delete to authenticated
using (user_id = (select auth.uid()) and loopedin_private.is_event_member(event_id));

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.loopedin_profiles,
  public.loopedin_groups,
  public.loopedin_group_members,
  public.loopedin_events,
  public.loopedin_rsvps,
  public.loopedin_event_messages,
  public.loopedin_event_media,
  public.loopedin_notifications,
  public.loopedin_reminder_drafts
to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'loopedin-event-media',
  'loopedin-event-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "loopedin_media_select_event_members" on storage.objects;
create policy "loopedin_media_select_event_members" on storage.objects
for select to authenticated
using (
  bucket_id = 'loopedin-event-media'
  and loopedin_private.is_event_member(loopedin_private.storage_event_id(name))
);

drop policy if exists "loopedin_media_insert_event_members" on storage.objects;
create policy "loopedin_media_insert_event_members" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'loopedin-event-media'
  and loopedin_private.is_event_member(loopedin_private.storage_event_id(name))
);

drop policy if exists "loopedin_media_update_event_members" on storage.objects;
create policy "loopedin_media_update_event_members" on storage.objects
for update to authenticated
using (
  bucket_id = 'loopedin-event-media'
  and loopedin_private.is_event_member(loopedin_private.storage_event_id(name))
)
with check (
  bucket_id = 'loopedin-event-media'
  and loopedin_private.is_event_member(loopedin_private.storage_event_id(name))
);

drop policy if exists "loopedin_media_delete_event_members" on storage.objects;
create policy "loopedin_media_delete_event_members" on storage.objects
for delete to authenticated
using (
  bucket_id = 'loopedin-event-media'
  and loopedin_private.is_event_member(loopedin_private.storage_event_id(name))
);

do $$
begin
  alter publication supabase_realtime add table public.loopedin_events;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.loopedin_rsvps;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.loopedin_event_messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.loopedin_event_media;
exception when duplicate_object then null;
end $$;
