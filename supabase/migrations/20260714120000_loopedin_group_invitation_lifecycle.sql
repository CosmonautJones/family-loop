alter table public.loopedin_groups
  add column if not exists creation_key uuid;

alter table public.loopedin_groups
  drop constraint if exists loopedin_groups_created_by_fkey,
  add constraint loopedin_groups_created_by_fkey foreign key (created_by) references auth.users(id) on delete restrict;

alter table public.loopedin_events
  drop constraint if exists loopedin_events_created_by_fkey,
  add constraint loopedin_events_created_by_fkey foreign key (created_by) references auth.users(id) on delete restrict;

create unique index if not exists loopedin_groups_creator_creation_key_idx
  on public.loopedin_groups (created_by, creation_key)
  where creation_key is not null;

create table if not exists loopedin_private.loopedin_group_creation_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provisioned_at timestamptz not null default now(),
  consumed_at timestamptz,
  group_id uuid unique references public.loopedin_groups(id) on delete set null,
  check ((consumed_at is null and group_id is null) or consumed_at is not null)
);

revoke all on loopedin_private.loopedin_group_creation_entitlements from public, anon, authenticated;

create table if not exists public.loopedin_group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.loopedin_groups(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  invitee_email text not null,
  token_hash bytea not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'revoked', 'expired')),
  expires_at timestamptz not null,
  responded_by uuid references auth.users(id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  check (invitee_email = lower(btrim(invitee_email))),
  check (expires_at > created_at)
);

create unique index if not exists loopedin_group_invitations_one_pending_idx
  on public.loopedin_group_invitations (group_id, invitee_email)
  where status = 'pending';

alter table public.loopedin_group_invitations enable row level security;

revoke all on public.loopedin_group_invitations from anon, authenticated;

revoke insert, update, delete on public.loopedin_groups from authenticated;
revoke insert, update, delete on public.loopedin_group_members from authenticated;

do $$
declare malformed record;
begin
  select grp.id, count(member.user_id) filter (where member.role = 'owner') as owner_count
  into malformed
  from public.loopedin_groups grp
  left join public.loopedin_group_members member on member.group_id = grp.id
  group by grp.id
  having count(member.user_id) filter (where member.role = 'owner') <> 1
  limit 1;
  if found then
    raise exception 'Cannot enforce one-owner invariant: group % has % owners.', malformed.id, malformed.owner_count
      using errcode = '23514';
  end if;
end;
$$;

create or replace function loopedin_private.assert_one_group_owner()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_group_id uuid;
begin
  if tg_table_name = 'loopedin_groups' then
    target_group_id := coalesce(new.id, old.id);
  else
    target_group_id := coalesce(new.group_id, old.group_id);
  end if;
  if exists (select 1 from public.loopedin_groups where id = target_group_id)
     and (select count(*) from public.loopedin_group_members where group_id = target_group_id and role = 'owner') <> 1 then
    raise exception 'A group must have exactly one owner.' using errcode = '23514';
  end if;
  return null;
end;
$$;

drop trigger if exists loopedin_groups_one_owner on public.loopedin_groups;
create constraint trigger loopedin_groups_one_owner
after insert or update on public.loopedin_groups
deferrable initially deferred
for each row execute function loopedin_private.assert_one_group_owner();

drop trigger if exists loopedin_members_one_owner on public.loopedin_group_members;
create constraint trigger loopedin_members_one_owner
after insert or update or delete on public.loopedin_group_members
deferrable initially deferred
for each row execute function loopedin_private.assert_one_group_owner();

create or replace function public.loopedin_create_group(
  target_name text,
  target_description text,
  target_kind text,
  target_creation_key uuid
)
returns public.loopedin_groups
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  created_group public.loopedin_groups;
  entitlement loopedin_private.loopedin_group_creation_entitlements;
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  if target_creation_key is null then raise exception 'A creation key is required.' using errcode = '22023'; end if;
  if nullif(btrim(target_name), '') is null then raise exception 'A group name is required.' using errcode = '22023'; end if;
  if target_kind not in ('family', 'friends') then raise exception 'Unsupported group kind.' using errcode = '22023'; end if;

  select * into created_group
  from public.loopedin_groups
  where created_by = actor_id and creation_key = target_creation_key;
  if created_group.id is not null then
    if created_group.name <> btrim(target_name)
       or created_group.description <> coalesce(btrim(target_description), '')
       or created_group.kind <> target_kind then
      raise exception 'The creation key was already used with different group details.' using errcode = '23505';
    end if;
    return created_group;
  end if;

  select * into entitlement
  from loopedin_private.loopedin_group_creation_entitlements
  where user_id = actor_id
  for update;
  if entitlement.user_id is null or entitlement.consumed_at is not null then
    select * into created_group
    from public.loopedin_groups
    where created_by = actor_id and creation_key = target_creation_key;
    if created_group.id is not null then
      if created_group.name <> btrim(target_name)
         or created_group.description <> coalesce(btrim(target_description), '')
         or created_group.kind <> target_kind then
        raise exception 'The creation key was already used with different group details.' using errcode = '23505';
      end if;
      return created_group;
    end if;
    raise exception 'Family creation is not available for this account.' using errcode = '42501';
  end if;

  insert into public.loopedin_groups (name, description, kind, created_by, creation_key)
  values (btrim(target_name), coalesce(btrim(target_description), ''), target_kind, actor_id, target_creation_key)
  on conflict (created_by, creation_key) where creation_key is not null do nothing
  returning * into created_group;

  if created_group.id is null then
    select * into strict created_group
    from public.loopedin_groups
    where created_by = actor_id and creation_key = target_creation_key;
    if created_group.name <> btrim(target_name)
       or created_group.description <> coalesce(btrim(target_description), '')
       or created_group.kind <> target_kind then
      raise exception 'The creation key was already used with different group details.' using errcode = '23505';
    end if;
  end if;

  insert into public.loopedin_group_members (group_id, user_id, role)
  values (created_group.id, actor_id, 'owner')
  on conflict (group_id, user_id) do nothing;

  update loopedin_private.loopedin_group_creation_entitlements
  set consumed_at = now(), group_id = created_group.id
  where user_id = actor_id and consumed_at is null;

  return created_group;
end;
$$;

create or replace function public.loopedin_can_create_group()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth.uid() is not null and exists (
    select 1 from loopedin_private.loopedin_group_creation_entitlements entitlement
    where entitlement.user_id = auth.uid() and entitlement.consumed_at is null
  );
$$;

create or replace function public.loopedin_create_group_invite(target_group_id uuid, target_email text, target_token text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  actor_id uuid := auth.uid();
  normalized_email text := lower(btrim(target_email));
  normalized_token text := lower(btrim(target_token));
  requested_hash bytea;
  created_invite public.loopedin_group_invitations;
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'Enter a valid email address.' using errcode = '22023';
  end if;
  if normalized_token !~ '^[0-9a-f]{64}$' then
    raise exception 'Invitation token must contain 32 random bytes encoded as hexadecimal.' using errcode = '22023';
  end if;
  requested_hash := extensions.digest(decode(normalized_token, 'hex'), 'sha256');
  if not exists (
    select 1 from public.loopedin_group_members
    where group_id = target_group_id and user_id = actor_id and role = 'owner'
  ) then raise exception 'Only the group owner can invite members.' using errcode = '42501'; end if;

  update public.loopedin_group_invitations
  set status = 'expired'
  where group_id = target_group_id and invitee_email = normalized_email
    and status = 'pending' and expires_at <= now();

  begin
    insert into public.loopedin_group_invitations
      (group_id, invited_by, invitee_email, token_hash, expires_at)
    values
      (target_group_id, actor_id, normalized_email, requested_hash, now() + interval '7 days')
    returning * into created_invite;
  exception when unique_violation then
    select * into created_invite from public.loopedin_group_invitations
    where group_id = target_group_id and invitee_email = normalized_email and token_hash = requested_hash and status = 'pending';
    if created_invite.id is null then
      return jsonb_build_object('ok', false, 'code', 'already_pending');
    end if;
  end;

  return jsonb_build_object(
    'ok', true,
    'code', case when created_invite.created_at < now() - interval '1 millisecond' then 'existing' else 'created' end,
    'invitationId', created_invite.id,
    'expiresAt', created_invite.expires_at
  );
end;
$$;

create or replace function public.loopedin_validate_group_invite(target_token text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  matching public.loopedin_group_invitations;
  masked_email text;
begin
  update public.loopedin_group_invitations
  set status = 'expired'
  where token_hash = case when lower(btrim(coalesce(target_token, ''))) ~ '^[0-9a-f]{64}$'
      then extensions.digest(decode(lower(btrim(target_token)), 'hex'), 'sha256') else null end
    and status = 'pending' and expires_at <= now();
  select * into matching
  from public.loopedin_group_invitations
  where token_hash = case when lower(btrim(coalesce(target_token, ''))) ~ '^[0-9a-f]{64}$'
    then extensions.digest(decode(lower(btrim(target_token)), 'hex'), 'sha256') else null end
    and status = 'pending' and expires_at > now();
  if matching.id is null then return jsonb_build_object('ok', false, 'code', 'unavailable'); end if;
  masked_email := left(split_part(matching.invitee_email, '@', 1), 1) || '***@' || split_part(matching.invitee_email, '@', 2);
  return (
    select jsonb_build_object('ok', true, 'code', 'ready', 'groupId', grp.id, 'groupName', grp.name,
      'inviterName', coalesce(profile.display_name, 'Family organizer'), 'maskedEmail', masked_email, 'expiresAt', matching.expires_at)
    from public.loopedin_groups grp
    left join public.loopedin_profiles profile on profile.id = matching.invited_by
    where grp.id = matching.group_id
  );
end;
$$;

create or replace function public.loopedin_accept_group_invite(target_token text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  actor_id uuid := auth.uid();
  actor_email text := lower(coalesce(auth.jwt()->>'email', ''));
  matching public.loopedin_group_invitations;
begin
  if actor_id is null then return jsonb_build_object('ok', false, 'code', 'unavailable'); end if;
  if not exists (select 1 from auth.users where id = actor_id and email_confirmed_at is not null and lower(email) = actor_email) then
    return jsonb_build_object('ok', false, 'code', 'unavailable');
  end if;
  select * into matching
  from public.loopedin_group_invitations
  where token_hash = case when lower(btrim(coalesce(target_token, ''))) ~ '^[0-9a-f]{64}$'
      then extensions.digest(decode(lower(btrim(target_token)), 'hex'), 'sha256') else null end
    and invitee_email = actor_email and status in ('pending', 'accepted')
  for update;
  if matching.id is not null and matching.status = 'pending' and matching.expires_at <= now() then
    update public.loopedin_group_invitations set status = 'expired' where id = matching.id;
  end if;
  if matching.id is null or matching.expires_at <= now() or (matching.status = 'accepted' and matching.responded_by <> actor_id) then
    return jsonb_build_object('ok', false, 'code', 'unavailable');
  end if;
  if matching.status = 'pending' then
    insert into public.loopedin_group_members (group_id, user_id, role)
    values (matching.group_id, actor_id, 'member')
    on conflict (group_id, user_id) do nothing;
    update public.loopedin_group_invitations
    set status = 'accepted', responded_by = actor_id, responded_at = now()
    where id = matching.id;
  end if;
  return jsonb_build_object('ok', true, 'code', 'joined', 'groupId', matching.group_id);
end;
$$;

create or replace function public.loopedin_decline_group_invite(target_token text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  actor_id uuid := auth.uid();
  actor_email text := lower(coalesce(auth.jwt()->>'email', ''));
  matching public.loopedin_group_invitations;
begin
  if actor_id is null then return jsonb_build_object('ok', false, 'code', 'unavailable'); end if;
  if not exists (select 1 from auth.users where id = actor_id and email_confirmed_at is not null and lower(email) = actor_email) then
    return jsonb_build_object('ok', false, 'code', 'unavailable');
  end if;
  select * into matching
  from public.loopedin_group_invitations
  where token_hash = case when lower(btrim(coalesce(target_token, ''))) ~ '^[0-9a-f]{64}$'
      then extensions.digest(decode(lower(btrim(target_token)), 'hex'), 'sha256') else null end
    and invitee_email = actor_email and status in ('pending', 'declined')
  for update;
  if matching.id is not null and matching.status = 'pending' and matching.expires_at <= now() then
    update public.loopedin_group_invitations set status = 'expired' where id = matching.id;
  end if;
  if matching.id is null or matching.expires_at <= now() or (matching.status = 'declined' and matching.responded_by <> actor_id) then
    return jsonb_build_object('ok', false, 'code', 'unavailable');
  end if;
  if matching.status = 'pending' then
    update public.loopedin_group_invitations
    set status = 'declined', responded_by = actor_id, responded_at = now()
    where id = matching.id;
  end if;
  return jsonb_build_object('ok', true, 'code', 'declined');
end;
$$;

create or replace function public.loopedin_list_group_invites(target_group_id uuid)
returns table (id uuid, invitee_email text, status text, expires_at timestamptz, created_at timestamptz)
language sql
security definer
set search_path = pg_catalog, public
as $$
  select invitation.id, invitation.invitee_email,
    case when invitation.status = 'pending' and invitation.expires_at <= now() then 'expired' else invitation.status end,
    invitation.expires_at, invitation.created_at
  from public.loopedin_group_invitations invitation
  where invitation.group_id = target_group_id
    and exists (
      select 1 from public.loopedin_group_members member
      where member.group_id = target_group_id and member.user_id = auth.uid() and member.role = 'owner'
    )
  order by invitation.created_at desc;
$$;

create or replace function public.loopedin_revoke_group_invite(target_invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare matching public.loopedin_group_invitations;
begin
  select * into matching from public.loopedin_group_invitations where id = target_invitation_id for update;
  if matching.id is null or not exists (
    select 1 from public.loopedin_group_members
    where group_id = matching.group_id and user_id = auth.uid() and role = 'owner'
  ) then return jsonb_build_object('ok', false, 'code', 'unavailable'); end if;
  if matching.status = 'pending' and matching.expires_at <= now() then
    update public.loopedin_group_invitations set status = 'expired' where id = matching.id;
    return jsonb_build_object('ok', false, 'code', 'not_pending');
  elsif matching.status = 'pending' then
    update public.loopedin_group_invitations set status = 'revoked' where id = matching.id;
  elsif matching.status <> 'revoked' then
    return jsonb_build_object('ok', false, 'code', 'not_pending');
  end if;
  return jsonb_build_object('ok', true, 'code', 'revoked');
end;
$$;

create or replace function public.loopedin_remove_group_member(target_group_id uuid, target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare target_role text;
begin
  perform 1 from public.loopedin_groups where id = target_group_id for update;
  if not exists (
    select 1 from public.loopedin_group_members
    where group_id = target_group_id and user_id = auth.uid() and role = 'owner'
  ) then raise exception 'Only the group owner can remove members.' using errcode = '42501'; end if;
  select role into target_role from public.loopedin_group_members where group_id = target_group_id and user_id = target_user_id for update;
  if target_role is null then return jsonb_build_object('ok', true, 'code', 'not_member'); end if;
  if target_role = 'owner' then raise exception 'Transfer ownership before removing the owner.' using errcode = '23514'; end if;
  delete from public.loopedin_group_members where group_id = target_group_id and user_id = target_user_id;
  return jsonb_build_object('ok', true, 'code', 'removed');
end;
$$;

create or replace function public.loopedin_leave_group(target_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare actor_role text;
begin
  perform 1 from public.loopedin_groups where id = target_group_id for update;
  select role into actor_role from public.loopedin_group_members where group_id = target_group_id and user_id = auth.uid() for update;
  if actor_role is null then return jsonb_build_object('ok', true, 'code', 'not_member'); end if;
  if actor_role = 'owner' then raise exception 'Transfer ownership before leaving the group.' using errcode = '23514'; end if;
  delete from public.loopedin_group_members where group_id = target_group_id and user_id = auth.uid();
  return jsonb_build_object('ok', true, 'code', 'left');
end;
$$;

create or replace function public.loopedin_transfer_group_ownership(target_group_id uuid, target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare actor_id uuid := auth.uid();
begin
  perform 1 from public.loopedin_groups where id = target_group_id for update;
  if not exists (
    select 1 from public.loopedin_group_members
    where group_id = target_group_id and user_id = actor_id and role = 'owner'
  ) then raise exception 'Only the group owner can transfer ownership.' using errcode = '42501'; end if;
  if target_user_id = actor_id then return jsonb_build_object('ok', true, 'code', 'already_owner'); end if;
  if not exists (
    select 1 from public.loopedin_group_members where group_id = target_group_id and user_id = target_user_id
  ) then raise exception 'The new owner must already be a member.' using errcode = '23514'; end if;
  update public.loopedin_group_members set role = 'member' where group_id = target_group_id and user_id = actor_id;
  update public.loopedin_group_members set role = 'owner' where group_id = target_group_id and user_id = target_user_id;
  return jsonb_build_object('ok', true, 'code', 'transferred');
end;
$$;

drop policy if exists "notifications_select_self" on public.loopedin_notifications;
create policy "notifications_select_self" on public.loopedin_notifications
for select to authenticated
using (
  user_id = (select auth.uid())
  and (
    (group_id is not null and loopedin_private.is_group_member(group_id))
    or (group_id is null and event_id is not null and loopedin_private.is_event_member(event_id))
  )
);

drop policy if exists "notifications_update_self" on public.loopedin_notifications;
create policy "notifications_update_self" on public.loopedin_notifications
for update to authenticated
using (
  user_id = (select auth.uid())
  and (
    (group_id is not null and loopedin_private.is_group_member(group_id))
    or (group_id is null and event_id is not null and loopedin_private.is_event_member(event_id))
  )
)
with check (
  user_id = (select auth.uid())
  and (
    (group_id is not null and loopedin_private.is_group_member(group_id))
    or (group_id is null and event_id is not null and loopedin_private.is_event_member(event_id))
  )
);

revoke insert, delete on public.loopedin_notifications from authenticated;
revoke update on public.loopedin_notifications from authenticated;
grant update (read) on public.loopedin_notifications to authenticated;

revoke all on function loopedin_private.assert_one_group_owner() from public;
grant execute on function loopedin_private.assert_one_group_owner() to postgres;

revoke all on function public.loopedin_create_group(text, text, text, uuid) from public;
revoke all on function public.loopedin_can_create_group() from public;
revoke all on function public.loopedin_create_group_invite(uuid, text, text) from public;
revoke all on function public.loopedin_validate_group_invite(text) from public;
revoke all on function public.loopedin_accept_group_invite(text) from public;
revoke all on function public.loopedin_decline_group_invite(text) from public;
revoke all on function public.loopedin_list_group_invites(uuid) from public;
revoke all on function public.loopedin_revoke_group_invite(uuid) from public;
revoke all on function public.loopedin_remove_group_member(uuid, uuid) from public;
revoke all on function public.loopedin_leave_group(uuid) from public;
revoke all on function public.loopedin_transfer_group_ownership(uuid, uuid) from public;

grant execute on function public.loopedin_create_group(text, text, text, uuid) to authenticated;
grant execute on function public.loopedin_can_create_group() to authenticated;
grant execute on function public.loopedin_create_group_invite(uuid, text, text) to authenticated;
grant execute on function public.loopedin_validate_group_invite(text) to anon, authenticated;
grant execute on function public.loopedin_accept_group_invite(text) to authenticated;
grant execute on function public.loopedin_decline_group_invite(text) to authenticated;
grant execute on function public.loopedin_list_group_invites(uuid) to authenticated;
grant execute on function public.loopedin_revoke_group_invite(uuid) to authenticated;
grant execute on function public.loopedin_remove_group_member(uuid, uuid) to authenticated;
grant execute on function public.loopedin_leave_group(uuid) to authenticated;
grant execute on function public.loopedin_transfer_group_ownership(uuid, uuid) to authenticated;
