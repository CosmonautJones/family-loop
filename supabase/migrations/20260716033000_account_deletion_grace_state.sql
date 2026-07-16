create table loopedin_private.loopedin_account_deletion_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  status text not null default 'pending' check (status in ('pending', 'canceled')),
  requested_at timestamptz not null default now(),
  purge_after timestamptz not null,
  backup_expires_after timestamptz not null,
  canceled_at timestamptz,
  check (purge_after = requested_at + interval '30 days'),
  check (backup_expires_after = purge_after + interval '30 days'),
  check ((status = 'pending' and canceled_at is null) or (status = 'canceled' and canceled_at is not null))
);

create unique index loopedin_account_deletion_requests_one_pending_idx
on loopedin_private.loopedin_account_deletion_requests (user_id)
where status = 'pending';

create index loopedin_account_deletion_requests_purge_after_idx
on loopedin_private.loopedin_account_deletion_requests (purge_after)
where status = 'pending';

create table loopedin_private.loopedin_account_legal_holds (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  reason_code text not null check (reason_code ~ '^[A-Z][A-Z0-9_]{2,31}$'),
  placed_by_reference text not null check (placed_by_reference ~ '^[A-Z0-9][A-Z0-9._:-]{2,79}$'),
  placed_at timestamptz not null default now(),
  released_by_reference text check (released_by_reference ~ '^[A-Z0-9][A-Z0-9._:-]{2,79}$'),
  released_at timestamptz,
  check ((released_at is null and released_by_reference is null) or (released_at is not null and released_by_reference is not null))
);

create unique index loopedin_account_legal_holds_one_active_idx
on loopedin_private.loopedin_account_legal_holds (user_id)
where released_at is null;

create table loopedin_private.loopedin_account_lifecycle_records (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  request_id bigint references loopedin_private.loopedin_account_deletion_requests(id) on delete restrict,
  action text not null check (action in ('deletion_requested', 'deletion_canceled', 'legal_hold_placed', 'legal_hold_released')),
  operator_reference text check (operator_reference ~ '^[A-Z0-9][A-Z0-9._:-]{2,79}$'),
  occurred_at timestamptz not null default now(),
  check (
    (action in ('deletion_requested', 'deletion_canceled') and operator_reference is null)
    or (action in ('legal_hold_placed', 'legal_hold_released') and operator_reference is not null)
  )
);

create index loopedin_account_lifecycle_records_user_time_idx
on loopedin_private.loopedin_account_lifecycle_records (user_id, occurred_at desc);

revoke all on
  loopedin_private.loopedin_account_deletion_requests,
  loopedin_private.loopedin_account_legal_holds,
  loopedin_private.loopedin_account_lifecycle_records
from public, anon, authenticated, service_role;

create or replace function loopedin_private.account_access_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and not exists (
      select 1
      from loopedin_private.loopedin_account_deletion_requests request
      where request.user_id = (select auth.uid())
        and request.status = 'pending'
    );
$$;

create or replace function loopedin_private.require_active_account()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not loopedin_private.account_access_active() then
    raise exception 'This account is pending deletion.' using errcode = '42501';
  end if;
end;
$$;

create or replace function loopedin_private.guard_active_account_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not loopedin_private.account_access_active() then
    raise exception 'This account is pending deletion.' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function loopedin_private.account_access_active() from public;
revoke all on function loopedin_private.require_active_account() from public, anon, authenticated;
revoke all on function loopedin_private.guard_active_account_mutation() from public, anon, authenticated;
grant execute on function loopedin_private.account_access_active() to authenticated;

create or replace function loopedin_private.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select loopedin_private.account_access_active()
    and exists (
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
set search_path = ''
as $$
  select loopedin_private.account_access_active()
    and exists (
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
set search_path = ''
as $$
  select loopedin_private.account_access_active()
    and exists (
      select 1
      from public.loopedin_events event
      join public.loopedin_group_members member on member.group_id = event.group_id
      where event.id = target_event_id
        and member.user_id = (select auth.uid())
    );
$$;

create or replace function loopedin_private.can_read_media_object(target_storage_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select loopedin_private.account_access_active()
    and exists (
      select 1 from public.loopedin_event_media media
      where media.storage_path = target_storage_path
        and (
          (media.status = 'active' and loopedin_private.is_event_member(media.event_id))
          or (
            media.status = 'deleting'
            and media.delete_requested_by = (select auth.uid())
            and storage.allow_any_operation(array[
              'storage.object.delete',
              'storage.object.delete_many'
            ])
          )
        )
    );
$$;

create or replace function loopedin_private.can_delete_claimed_media_object(
  target_storage_path text,
  target_owner_id text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select loopedin_private.account_access_active()
    and exists (
      select 1
      from public.loopedin_event_media media
      join public.loopedin_events event on event.id = media.event_id
      where media.storage_path = target_storage_path
        and media.status = 'deleting'
        and media.delete_requested_by = (select auth.uid())
        and (target_owner_id = (select auth.uid())::text
          or loopedin_private.can_manage_group(event.group_id))
    );
$$;

drop policy if exists "profiles_select_related" on public.loopedin_profiles;
create policy "profiles_select_related" on public.loopedin_profiles
for select to authenticated
using (
  loopedin_private.account_access_active()
  and (
    id = (select auth.uid())
    or exists (
      select 1
      from public.loopedin_group_members mine
      join public.loopedin_group_members theirs on theirs.group_id = mine.group_id
      where mine.user_id = (select auth.uid())
        and theirs.user_id = loopedin_profiles.id
    )
  )
);

drop policy if exists "profiles_insert_self" on public.loopedin_profiles;
create policy "profiles_insert_self" on public.loopedin_profiles
for insert to authenticated
with check (loopedin_private.account_access_active() and id = (select auth.uid()));

drop policy if exists "profiles_update_self" on public.loopedin_profiles;
create policy "profiles_update_self" on public.loopedin_profiles
for update to authenticated
using (loopedin_private.account_access_active() and id = (select auth.uid()))
with check (loopedin_private.account_access_active() and id = (select auth.uid()));

drop policy if exists "groups_select_member_or_creator" on public.loopedin_groups;
create policy "groups_select_member_or_creator" on public.loopedin_groups
for select to authenticated
using (
  loopedin_private.account_access_active()
  and (created_by = (select auth.uid()) or loopedin_private.is_group_member(id))
);

drop policy if exists "groups_insert_creator" on public.loopedin_groups;
create policy "groups_insert_creator" on public.loopedin_groups
for insert to authenticated
with check (loopedin_private.account_access_active() and created_by = (select auth.uid()));

drop policy if exists "groups_delete_owner" on public.loopedin_groups;
create policy "groups_delete_owner" on public.loopedin_groups
for delete to authenticated
using (
  loopedin_private.account_access_active()
  and exists (
    select 1 from public.loopedin_group_members member
    where member.group_id = loopedin_groups.id
      and member.user_id = (select auth.uid())
      and member.role = 'owner'
  )
);

drop policy if exists "members_insert_creator_or_manager" on public.loopedin_group_members;
create policy "members_insert_creator_or_manager" on public.loopedin_group_members
for insert to authenticated
with check (
  loopedin_private.account_access_active()
  and user_id = (select auth.uid())
  and (
    exists (
      select 1 from public.loopedin_groups grp
      where grp.id = group_id and grp.created_by = (select auth.uid())
    )
    or loopedin_private.can_manage_group(group_id)
  )
);

drop policy if exists "members_delete_manager_or_self" on public.loopedin_group_members;
create policy "members_delete_manager_or_self" on public.loopedin_group_members
for delete to authenticated
using (
  loopedin_private.account_access_active()
  and (user_id = (select auth.uid()) or loopedin_private.can_manage_group(group_id))
);

drop policy if exists "events_update_manager_or_creator" on public.loopedin_events;
create policy "events_update_manager_or_creator" on public.loopedin_events
for update to authenticated
using (
  loopedin_private.account_access_active()
  and (created_by = (select auth.uid()) or loopedin_private.can_manage_group(group_id))
)
with check (
  loopedin_private.account_access_active()
  and (created_by = (select auth.uid()) or loopedin_private.can_manage_group(group_id))
);

drop policy if exists "events_delete_manager_or_creator" on public.loopedin_events;
create policy "events_delete_manager_or_creator" on public.loopedin_events
for delete to authenticated
using (
  loopedin_private.account_access_active()
  and (created_by = (select auth.uid()) or loopedin_private.can_manage_group(group_id))
);

do $$
declare
  protected_table regclass;
begin
  foreach protected_table in array array[
    'public.loopedin_profiles'::regclass,
    'public.loopedin_groups'::regclass,
    'public.loopedin_group_members'::regclass,
    'public.loopedin_events'::regclass,
    'public.loopedin_rsvps'::regclass,
    'public.loopedin_event_messages'::regclass,
    'public.loopedin_event_media'::regclass,
    'public.loopedin_notifications'::regclass,
    'public.loopedin_reminder_drafts'::regclass,
    'public.loopedin_group_invitations'::regclass
  ] loop
    execute format('drop trigger if exists loopedin_guard_active_account on %s', protected_table);
    execute format(
      'create trigger loopedin_guard_active_account before insert or update or delete on %s for each row execute function loopedin_private.guard_active_account_mutation()',
      protected_table
    );
  end loop;
end;
$$;

alter function public.loopedin_create_group(text, text, text, uuid)
  rename to loopedin_create_group_active_impl;
alter function public.loopedin_can_create_group()
  rename to loopedin_can_create_group_active_impl;
alter function public.loopedin_create_group_invite(uuid, text, text)
  rename to loopedin_create_group_invite_active_impl;
alter function public.loopedin_accept_group_invite(text)
  rename to loopedin_accept_group_invite_active_impl;
alter function public.loopedin_decline_group_invite(text)
  rename to loopedin_decline_group_invite_active_impl;
alter function public.loopedin_list_group_invites(uuid)
  rename to loopedin_list_group_invites_active_impl;
alter function public.loopedin_revoke_group_invite(uuid)
  rename to loopedin_revoke_group_invite_active_impl;
alter function public.loopedin_remove_group_member(uuid, uuid)
  rename to loopedin_remove_group_member_active_impl;
alter function public.loopedin_leave_group(uuid)
  rename to loopedin_leave_group_active_impl;
alter function public.loopedin_transfer_group_ownership(uuid, uuid)
  rename to loopedin_transfer_group_ownership_active_impl;
alter function public.loopedin_create_event(uuid, text, timestamptz, timestamptz, text, text, text, text, jsonb, text, uuid)
  rename to loopedin_create_event_active_impl;
alter function public.loopedin_send_event_message(uuid, text, uuid)
  rename to loopedin_send_event_message_active_impl;

revoke all on function public.loopedin_create_group_active_impl(text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.loopedin_can_create_group_active_impl() from public, anon, authenticated;
revoke all on function public.loopedin_create_group_invite_active_impl(uuid, text, text) from public, anon, authenticated;
revoke all on function public.loopedin_accept_group_invite_active_impl(text) from public, anon, authenticated;
revoke all on function public.loopedin_decline_group_invite_active_impl(text) from public, anon, authenticated;
revoke all on function public.loopedin_list_group_invites_active_impl(uuid) from public, anon, authenticated;
revoke all on function public.loopedin_revoke_group_invite_active_impl(uuid) from public, anon, authenticated;
revoke all on function public.loopedin_remove_group_member_active_impl(uuid, uuid) from public, anon, authenticated;
revoke all on function public.loopedin_leave_group_active_impl(uuid) from public, anon, authenticated;
revoke all on function public.loopedin_transfer_group_ownership_active_impl(uuid, uuid) from public, anon, authenticated;
revoke all on function public.loopedin_create_event_active_impl(uuid, text, timestamptz, timestamptz, text, text, text, text, jsonb, text, uuid) from public, anon, authenticated;
revoke all on function public.loopedin_send_event_message_active_impl(uuid, text, uuid) from public, anon, authenticated;

create function public.loopedin_create_group(
  target_name text,
  target_description text,
  target_kind text,
  target_creation_key uuid
)
returns public.loopedin_groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor_id::text, 0));
  perform loopedin_private.require_active_account();
  return public.loopedin_create_group_active_impl(target_name, target_description, target_kind, target_creation_key);
end;
$$;

create function public.loopedin_can_create_group()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform loopedin_private.require_active_account();
  return public.loopedin_can_create_group_active_impl();
end;
$$;

create function public.loopedin_create_group_invite(target_group_id uuid, target_email text, target_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform loopedin_private.require_active_account();
  return public.loopedin_create_group_invite_active_impl(target_group_id, target_email, target_token);
end;
$$;

create function public.loopedin_accept_group_invite(target_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform loopedin_private.require_active_account();
  return public.loopedin_accept_group_invite_active_impl(target_token);
end;
$$;

create function public.loopedin_decline_group_invite(target_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform loopedin_private.require_active_account();
  return public.loopedin_decline_group_invite_active_impl(target_token);
end;
$$;

create function public.loopedin_list_group_invites(target_group_id uuid)
returns table (id uuid, invitee_email text, status text, expires_at timestamptz, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform loopedin_private.require_active_account();
  return query select * from public.loopedin_list_group_invites_active_impl(target_group_id);
end;
$$;

create function public.loopedin_revoke_group_invite(target_invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform loopedin_private.require_active_account();
  return public.loopedin_revoke_group_invite_active_impl(target_invitation_id);
end;
$$;

create function public.loopedin_remove_group_member(target_group_id uuid, target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform loopedin_private.require_active_account();
  return public.loopedin_remove_group_member_active_impl(target_group_id, target_user_id);
end;
$$;

create function public.loopedin_leave_group(target_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform loopedin_private.require_active_account();
  return public.loopedin_leave_group_active_impl(target_group_id);
end;
$$;

create function public.loopedin_transfer_group_ownership(target_group_id uuid, target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_lock bigint;
  target_lock bigint;
begin
  perform loopedin_private.require_active_account();
  if target_user_id is null then raise exception 'The new owner is required.' using errcode = '22023'; end if;
  actor_lock := pg_catalog.hashtextextended(actor_id::text, 0);
  target_lock := pg_catalog.hashtextextended(target_user_id::text, 0);
  perform pg_catalog.pg_advisory_xact_lock(least(actor_lock, target_lock));
  if actor_lock <> target_lock then perform pg_catalog.pg_advisory_xact_lock(greatest(actor_lock, target_lock)); end if;
  if exists (
    select 1
    from loopedin_private.loopedin_account_deletion_requests request
    where request.user_id = target_user_id and request.status = 'pending'
  ) then
    raise exception 'The new owner cannot have a pending account deletion.' using errcode = '23514';
  end if;
  return public.loopedin_transfer_group_ownership_active_impl(target_group_id, target_user_id);
end;
$$;

create function public.loopedin_create_event(
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
set search_path = ''
as $$
begin
  perform loopedin_private.require_active_account();
  return public.loopedin_create_event_active_impl(
    target_group_id, target_title, target_starts_at, target_ends_at, target_location,
    target_description, target_status_label, target_visibility, target_timeline,
    target_cover_url, target_operation_key
  );
end;
$$;

create function public.loopedin_send_event_message(target_event_id uuid, target_body text, target_operation_key uuid)
returns public.loopedin_event_messages
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform loopedin_private.require_active_account();
  return public.loopedin_send_event_message_active_impl(target_event_id, target_body, target_operation_key);
end;
$$;

revoke all on function public.loopedin_create_group(text, text, text, uuid) from public, anon;
revoke all on function public.loopedin_can_create_group() from public, anon;
revoke all on function public.loopedin_create_group_invite(uuid, text, text) from public, anon;
revoke all on function public.loopedin_accept_group_invite(text) from public, anon;
revoke all on function public.loopedin_decline_group_invite(text) from public, anon;
revoke all on function public.loopedin_list_group_invites(uuid) from public, anon;
revoke all on function public.loopedin_revoke_group_invite(uuid) from public, anon;
revoke all on function public.loopedin_remove_group_member(uuid, uuid) from public, anon;
revoke all on function public.loopedin_leave_group(uuid) from public, anon;
revoke all on function public.loopedin_transfer_group_ownership(uuid, uuid) from public, anon;
revoke all on function public.loopedin_create_event(uuid, text, timestamptz, timestamptz, text, text, text, text, jsonb, text, uuid) from public, anon;
revoke all on function public.loopedin_send_event_message(uuid, text, uuid) from public, anon;

grant execute on function public.loopedin_create_group(text, text, text, uuid) to authenticated;
grant execute on function public.loopedin_can_create_group() to authenticated;
grant execute on function public.loopedin_create_group_invite(uuid, text, text) to authenticated;
grant execute on function public.loopedin_accept_group_invite(text) to authenticated;
grant execute on function public.loopedin_decline_group_invite(text) to authenticated;
grant execute on function public.loopedin_list_group_invites(uuid) to authenticated;
grant execute on function public.loopedin_revoke_group_invite(uuid) to authenticated;
grant execute on function public.loopedin_remove_group_member(uuid, uuid) to authenticated;
grant execute on function public.loopedin_leave_group(uuid) to authenticated;
grant execute on function public.loopedin_transfer_group_ownership(uuid, uuid) to authenticated;
grant execute on function public.loopedin_create_event(uuid, text, timestamptz, timestamptz, text, text, text, text, jsonb, text, uuid) to authenticated;
grant execute on function public.loopedin_send_event_message(uuid, text, uuid) to authenticated;

create function public.loopedin_get_account_deletion_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when request.id is null then null else jsonb_build_object(
    'status', 'pending',
    'requestedAt', request.requested_at,
    'purgeAfter', request.purge_after,
    'backupExpiresAfter', request.backup_expires_after
  ) end
  from (select auth.uid() as user_id) actor
  left join loopedin_private.loopedin_account_deletion_requests request
    on request.user_id = actor.user_id and request.status = 'pending';
$$;

create function public.loopedin_request_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  requested_time timestamptz := now();
  current_request loopedin_private.loopedin_account_deletion_requests;
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor_id::text, 0));
  select * into current_request
  from loopedin_private.loopedin_account_deletion_requests request
  where request.user_id = actor_id and request.status = 'pending'
  for update;
  if current_request.id is not null then
    return jsonb_build_object(
      'status', 'pending',
      'requestedAt', current_request.requested_at,
      'purgeAfter', current_request.purge_after,
      'backupExpiresAfter', current_request.backup_expires_after
    );
  end if;
  if not exists (
    select 1 from auth.users user_account
    where user_account.id = actor_id and user_account.last_sign_in_at >= now() - interval '5 minutes'
  ) then
    raise exception 'Sign in again before deleting your account.' using errcode = '42501';
  end if;
  perform 1
  from public.loopedin_group_members member
  where member.user_id = actor_id and member.role = 'owner'
  for update;
  if found then
    raise exception 'Transfer ownership before deleting your account.' using errcode = '23514';
  end if;
  insert into loopedin_private.loopedin_account_deletion_requests (
    user_id, requested_at, purge_after, backup_expires_after
  ) values (
    actor_id,
    requested_time,
    requested_time + interval '30 days',
    requested_time + interval '60 days'
  ) returning * into current_request;
  insert into loopedin_private.loopedin_account_lifecycle_records (user_id, request_id, action)
  values (actor_id, current_request.id, 'deletion_requested');
  return jsonb_build_object(
    'status', 'pending',
    'requestedAt', current_request.requested_at,
    'purgeAfter', current_request.purge_after,
    'backupExpiresAfter', current_request.backup_expires_after
  );
end;
$$;

create function public.loopedin_cancel_account_deletion()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  current_request loopedin_private.loopedin_account_deletion_requests;
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor_id::text, 0));
  select * into current_request
  from loopedin_private.loopedin_account_deletion_requests request
  where request.user_id = actor_id and request.status = 'pending'
  for update;
  if current_request.id is null then return true; end if;
  if not (current_request.purge_after > now()) then
    raise exception 'The recovery period has ended.' using errcode = '23514';
  end if;
  update loopedin_private.loopedin_account_deletion_requests
  set status = 'canceled', canceled_at = now()
  where id = current_request.id and status = 'pending';
  insert into loopedin_private.loopedin_account_lifecycle_records (user_id, request_id, action)
  values (actor_id, current_request.id, 'deletion_canceled');
  return true;
end;
$$;

create function public.loopedin_place_account_legal_hold(
  target_user_id uuid,
  target_reason_code text,
  target_operator_reference text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  hold_id bigint;
  request_id bigint;
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required.' using errcode = '42501'; end if;
  if target_user_id is null
    or target_reason_code !~ '^[A-Z][A-Z0-9_]{2,31}$'
    or target_operator_reference !~ '^[A-Z0-9][A-Z0-9._:-]{2,79}$' then
    raise exception 'A bounded reason and operator reference are required.' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_user_id::text, 0));
  select hold.id into hold_id
  from loopedin_private.loopedin_account_legal_holds hold
  where hold.user_id = target_user_id and hold.released_at is null
  for update;
  if hold_id is not null then return hold_id; end if;
  select request.id into request_id
  from loopedin_private.loopedin_account_deletion_requests request
  where request.user_id = target_user_id and request.status = 'pending';
  insert into loopedin_private.loopedin_account_legal_holds (
    user_id, reason_code, placed_by_reference
  ) values (
    target_user_id, target_reason_code, target_operator_reference
  ) returning id into hold_id;
  insert into loopedin_private.loopedin_account_lifecycle_records (
    user_id, request_id, action, operator_reference
  ) values (
    target_user_id, request_id, 'legal_hold_placed', target_operator_reference
  );
  return hold_id;
end;
$$;

create function public.loopedin_release_account_legal_hold(
  target_user_id uuid,
  target_operator_reference text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_hold loopedin_private.loopedin_account_legal_holds;
  request_id bigint;
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required.' using errcode = '42501'; end if;
  if target_user_id is null or target_operator_reference !~ '^[A-Z0-9][A-Z0-9._:-]{2,79}$' then
    raise exception 'A bounded operator reference is required.' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_user_id::text, 0));
  select * into current_hold
  from loopedin_private.loopedin_account_legal_holds hold
  where hold.user_id = target_user_id and hold.released_at is null
  for update;
  if current_hold.id is null then return false; end if;
  update loopedin_private.loopedin_account_legal_holds
  set released_at = now(), released_by_reference = target_operator_reference
  where id = current_hold.id and released_at is null;
  select request.id into request_id
  from loopedin_private.loopedin_account_deletion_requests request
  where request.user_id = target_user_id and request.status = 'pending';
  insert into loopedin_private.loopedin_account_lifecycle_records (
    user_id, request_id, action, operator_reference
  ) values (
    target_user_id, request_id, 'legal_hold_released', target_operator_reference
  );
  return true;
end;
$$;

revoke all on function public.loopedin_get_account_deletion_status() from public, anon;
revoke all on function public.loopedin_request_account_deletion() from public, anon;
revoke all on function public.loopedin_cancel_account_deletion() from public, anon;
revoke all on function public.loopedin_place_account_legal_hold(uuid, text, text) from public, anon, authenticated;
revoke all on function public.loopedin_release_account_legal_hold(uuid, text) from public, anon, authenticated;

grant execute on function public.loopedin_get_account_deletion_status() to authenticated;
grant execute on function public.loopedin_request_account_deletion() to authenticated;
grant execute on function public.loopedin_cancel_account_deletion() to authenticated;
grant execute on function public.loopedin_place_account_legal_hold(uuid, text, text) to service_role;
grant execute on function public.loopedin_release_account_legal_hold(uuid, text) to service_role;
