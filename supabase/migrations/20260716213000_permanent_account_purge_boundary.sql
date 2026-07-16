-- Permanent account erasure is a leased operator workflow. Storage bytes are
-- removed and verified outside Postgres before relational cleanup; Auth is last.

alter table public.loopedin_groups
  alter column created_by drop not null,
  drop constraint if exists loopedin_groups_created_by_fkey,
  add constraint loopedin_groups_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null;

alter table public.loopedin_events
  alter column created_by drop not null,
  drop constraint if exists loopedin_events_created_by_fkey,
  add constraint loopedin_events_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null;

create table loopedin_private.loopedin_account_purge_operations (
  id uuid primary key,
  request_id bigint references loopedin_private.loopedin_account_deletion_requests(id) on delete set null,
  user_id uuid,
  status text not null default 'leased'
    check (status in ('leased', 'prepared', 'relational_finalized', 'completed')),
  lease_owner text check (lease_owner ~ '^[A-Z0-9][A-Z0-9._:-]{2,79}$'),
  lease_expires_at timestamptz,
  frozen_plan jsonb,
  plan_digest text check (plan_digest is null or plan_digest ~ '^[a-f0-9]{64}$'),
  object_count integer not null default 0 check (object_count between 0 and 10000),
  created_at timestamptz not null default now(),
  prepared_at timestamptz,
  relational_finalized_at timestamptz,
  auth_deleted_at timestamptz,
  completed_at timestamptz,
  unique (request_id),
  check (
    (status = 'leased' and frozen_plan is null and plan_digest is null and prepared_at is null)
    or (status = 'prepared' and frozen_plan is not null and plan_digest is not null and prepared_at is not null)
    or (status = 'relational_finalized' and frozen_plan is not null and plan_digest is not null and relational_finalized_at is not null)
    or (status = 'completed' and user_id is null and request_id is null and plan_digest is not null and completed_at is not null)
  )
);

create index loopedin_account_purge_operations_status_lease_idx
on loopedin_private.loopedin_account_purge_operations (status, lease_expires_at);

revoke all on loopedin_private.loopedin_account_purge_operations
from public, anon, authenticated, service_role;

create or replace function public.loopedin_lease_account_purge(
  target_operation_id uuid,
  target_user_id uuid,
  target_lease_owner text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_request loopedin_private.loopedin_account_deletion_requests;
  current_operation loopedin_private.loopedin_account_purge_operations;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required.' using errcode = '42501';
  end if;
  if target_operation_id is null or target_user_id is null
     or target_lease_owner !~ '^[A-Z0-9][A-Z0-9._:-]{2,79}$' then
    raise exception 'A bounded purge operation and lease owner are required.' using errcode = '22023';
  end if;

  select * into current_operation
  from loopedin_private.loopedin_account_purge_operations operation
  where operation.id = target_operation_id
  for update;
  if current_operation.status = 'completed' then
    return jsonb_build_object(
      'operationId', current_operation.id,
      'status', 'completed',
      'planDigest', current_operation.plan_digest,
      'objectCount', current_operation.object_count
    );
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_user_id::text, 0));
  select * into current_request
  from loopedin_private.loopedin_account_deletion_requests request
  where request.user_id = target_user_id
    and request.status = 'pending'
    and request.purge_after <= now()
  for update;
  if current_request.id is null then
    raise exception 'Account is not eligible for permanent deletion.' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.loopedin_group_members member
    where member.user_id = target_user_id and member.role = 'owner'
  ) then
    raise exception 'Transfer ownership before permanent deletion.' using errcode = '23514';
  end if;
  if exists (
    select 1 from loopedin_private.loopedin_account_legal_holds legal_hold
    where legal_hold.user_id = target_user_id and legal_hold.released_at is null
  ) then
    raise exception 'An active legal hold prevents permanent deletion.' using errcode = '23514';
  end if;

  if current_operation.id is null then
    select * into current_operation
    from loopedin_private.loopedin_account_purge_operations operation
    where operation.request_id = current_request.id
    limit 1
    for update;
  end if;

  if current_operation.id is not null then
    if current_operation.id <> target_operation_id or current_operation.user_id <> target_user_id then
      raise exception 'A different purge operation already owns this request.' using errcode = '23505';
    end if;
    if current_operation.lease_expires_at > now()
       and current_operation.lease_owner <> target_lease_owner then
      raise exception 'The purge operation is already leased.' using errcode = '55P03';
    end if;
    update loopedin_private.loopedin_account_purge_operations
    set lease_owner = target_lease_owner,
        lease_expires_at = now() + interval '5 minutes'
    where id = current_operation.id
    returning * into current_operation;
  else
    insert into loopedin_private.loopedin_account_purge_operations (
      id, request_id, user_id, lease_owner, lease_expires_at
    ) values (
      target_operation_id, current_request.id, target_user_id,
      target_lease_owner, now() + interval '5 minutes'
    ) returning * into current_operation;
  end if;

  return jsonb_build_object(
    'operationId', current_operation.id,
    'status', current_operation.status,
    'planDigest', current_operation.plan_digest,
    'objectCount', current_operation.object_count,
    'backupExpiresAfter', current_request.backup_expires_after,
    'leaseExpiresAt', current_operation.lease_expires_at
  );
end;
$$;

create or replace function public.loopedin_prepare_account_purge(
  target_operation_id uuid,
  target_lease_owner text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_operation loopedin_private.loopedin_account_purge_operations;
  current_request loopedin_private.loopedin_account_deletion_requests;
  subject_id uuid;
  subject_email text;
  object_paths jsonb;
  row_counts jsonb;
  prepared_plan jsonb;
  prepared_digest text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required.' using errcode = '42501';
  end if;
  select * into current_operation
  from loopedin_private.loopedin_account_purge_operations operation
  where operation.id = target_operation_id
  for update;
  if current_operation.id is null then
    raise exception 'Purge operation not found.' using errcode = 'P0002';
  end if;
  if current_operation.status = 'completed' then
    return jsonb_build_object(
      'operationId', current_operation.id,
      'status', 'completed',
      'planDigest', current_operation.plan_digest,
      'objectCount', current_operation.object_count,
      'objectPaths', current_operation.frozen_plan -> 'objectPaths',
      'counts', current_operation.frozen_plan -> 'counts'
    );
  end if;
  subject_id := current_operation.user_id;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(subject_id::text, 0));
  select * into current_request
  from loopedin_private.loopedin_account_deletion_requests request
  where request.id = current_operation.request_id
    and request.user_id = subject_id
    and request.status = 'pending'
    and request.purge_after <= now()
  for update;
  if current_request.id is null then
    raise exception 'Account is not eligible for permanent deletion.' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.loopedin_group_members member
    where member.user_id = subject_id and member.role = 'owner'
  ) then
    raise exception 'Transfer ownership before permanent deletion.' using errcode = '23514';
  end if;
  if exists (
    select 1 from loopedin_private.loopedin_account_legal_holds legal_hold
    where legal_hold.user_id = subject_id and legal_hold.released_at is null
  ) then
    raise exception 'An active legal hold prevents permanent deletion.' using errcode = '23514';
  end if;
  if current_operation.lease_owner <> target_lease_owner
     or current_operation.lease_expires_at <= now() then
    raise exception 'A current matching purge lease is required.' using errcode = '55P03';
  end if;
  if current_operation.status in ('prepared', 'relational_finalized') then
    return jsonb_build_object(
      'operationId', current_operation.id,
      'status', current_operation.status,
      'planDigest', current_operation.plan_digest,
      'objectCount', current_operation.object_count,
      'objectPaths', current_operation.frozen_plan -> 'objectPaths',
      'counts', current_operation.frozen_plan -> 'counts',
      'backupExpiresAfter', current_operation.frozen_plan ->> 'backupExpiresAfter'
    );
  end if;

  select lower(btrim(auth_user.email)) into subject_email
  from auth.users auth_user
  where auth_user.id = subject_id;

  select coalesce(jsonb_agg(path order by path), '[]'::jsonb) into object_paths
  from (
    select distinct unioned.path
    from (
      select media.storage_path as path
      from public.loopedin_event_media media
      where media.uploaded_by = subject_id
      union
      select object.name as path
      from storage.objects object
      where object.bucket_id = 'loopedin-event-media'
        and object.owner_id = subject_id::text
    ) unioned
    where unioned.path is not null
  ) ordered_paths;

  select jsonb_build_object(
    'profiles', (select count(*) from public.loopedin_profiles profile where profile.id = subject_id),
    'memberships', (select count(*) from public.loopedin_group_members member where member.user_id = subject_id),
    'rsvps', (select count(*) from public.loopedin_rsvps rsvp where rsvp.user_id = subject_id),
    'messages', (select count(*) from public.loopedin_event_messages message where message.author_id = subject_id),
    'media', (select count(*) from public.loopedin_event_media media where media.uploaded_by = subject_id),
    'notifications', (select count(*) from public.loopedin_notifications notification where notification.user_id = subject_id),
    'reminders', (select count(*) from public.loopedin_reminder_drafts reminder where reminder.user_id = subject_id),
    'invitations', (
      select count(*) from public.loopedin_group_invitations invitation
      where invitation.invited_by = subject_id
         or invitation.responded_by = subject_id
         or (subject_email is not null and invitation.invitee_email = subject_email)
    )
  ) into row_counts;
  prepared_plan := jsonb_build_object(
    'format', 1,
    'operationId', current_operation.id,
    'requestId', current_request.id,
    'subjectId', subject_id,
    'backupExpiresAfter', current_request.backup_expires_after,
    'objectPaths', object_paths,
    'counts', row_counts
  );
  prepared_digest := encode(extensions.digest(convert_to(prepared_plan::text, 'UTF8'), 'sha256'), 'hex');

  update loopedin_private.loopedin_account_purge_operations
  set status = 'prepared',
      frozen_plan = prepared_plan,
      plan_digest = prepared_digest,
      object_count = jsonb_array_length(object_paths),
      prepared_at = now()
  where id = current_operation.id and status = 'leased'
  returning * into current_operation;
  if current_operation.id is null then
    raise exception 'Purge preparation conflict.' using errcode = '40001';
  end if;

  return jsonb_build_object(
    'operationId', current_operation.id,
    'status', current_operation.status,
    'planDigest', current_operation.plan_digest,
    'objectCount', current_operation.object_count,
    'objectPaths', current_operation.frozen_plan -> 'objectPaths',
    'counts', current_operation.frozen_plan -> 'counts',
    'backupExpiresAfter', current_operation.frozen_plan ->> 'backupExpiresAfter'
  );
end;
$$;

create or replace function public.loopedin_finalize_account_purge_relational(
  target_operation_id uuid,
  target_lease_owner text,
  target_plan_digest text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_operation loopedin_private.loopedin_account_purge_operations;
  current_request loopedin_private.loopedin_account_deletion_requests;
  subject_id uuid;
  subject_email text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required.' using errcode = '42501';
  end if;
  select * into current_operation
  from loopedin_private.loopedin_account_purge_operations operation
  where operation.id = target_operation_id
  for update;
  if current_operation.id is null then
    raise exception 'Purge operation not found.' using errcode = 'P0002';
  end if;
  if current_operation.status = 'completed' then
    return jsonb_build_object('operationId', current_operation.id, 'status', 'completed', 'planDigest', current_operation.plan_digest);
  end if;
  subject_id := current_operation.user_id;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(subject_id::text, 0));
  select * into current_request
  from loopedin_private.loopedin_account_deletion_requests request
  where request.id = current_operation.request_id
    and request.user_id = subject_id
    and request.status = 'pending'
    and request.purge_after <= now()
  for update;
  if current_request.id is null then
    raise exception 'Account is not eligible for permanent deletion.' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.loopedin_group_members member
    where member.user_id = subject_id and member.role = 'owner'
  ) then
    raise exception 'Transfer ownership before permanent deletion.' using errcode = '23514';
  end if;
  if exists (
    select 1 from loopedin_private.loopedin_account_legal_holds legal_hold
    where legal_hold.user_id = subject_id and legal_hold.released_at is null
  ) then
    raise exception 'An active legal hold prevents permanent deletion.' using errcode = '23514';
  end if;
  if current_operation.lease_owner <> target_lease_owner
     or current_operation.lease_expires_at <= now()
     or current_operation.plan_digest <> lower(target_plan_digest) then
    raise exception 'A current matching lease and plan digest are required.' using errcode = '55P03';
  end if;
  if current_operation.status = 'relational_finalized' then
    return jsonb_build_object('operationId', current_operation.id, 'status', current_operation.status, 'planDigest', current_operation.plan_digest);
  end if;
  if current_operation.status <> 'prepared' then
    raise exception 'The purge plan is not prepared.' using errcode = '23514';
  end if;

  if exists (
    select 1
    from storage.objects object
    where object.bucket_id = 'loopedin-event-media'
      and (
        object.owner_id = subject_id::text
        or object.name in (
          select jsonb_array_elements_text(current_operation.frozen_plan -> 'objectPaths')
        )
        or object.name in (
          select media.storage_path from public.loopedin_event_media media
          where media.uploaded_by = subject_id
        )
      )
  ) then
    raise exception 'Every planned private object must be absent before relational cleanup.' using errcode = '23514';
  end if;

  select lower(btrim(auth_user.email)) into subject_email
  from auth.users auth_user
  where auth_user.id = subject_id;

  delete from loopedin_private.loopedin_invitation_email_deliveries delivery
  where delivery.requested_by = subject_id
     or delivery.invitation_id in (
       select invitation.id
       from public.loopedin_group_invitations invitation
       where invitation.invited_by = subject_id
          or invitation.responded_by = subject_id
          or (subject_email is not null and invitation.invitee_email = subject_email)
     );
  delete from public.loopedin_group_invitations invitation
  where invitation.invited_by = subject_id
     or invitation.responded_by = subject_id
     or (subject_email is not null and invitation.invitee_email = subject_email);
  delete from loopedin_private.loopedin_event_create_operations operation
  where operation.actor_id = subject_id;
  delete from loopedin_private.loopedin_message_create_operations operation
  where operation.actor_id = subject_id;
  delete from loopedin_telemetry.client_error_rate_limits limiter
  where limiter.user_id = subject_id;
  delete from public.loopedin_event_media media
  where media.uploaded_by = subject_id
     or media.storage_path in (
       select jsonb_array_elements_text(current_operation.frozen_plan -> 'objectPaths')
     );
  delete from public.loopedin_event_messages message where message.author_id = subject_id;
  delete from public.loopedin_rsvps rsvp where rsvp.user_id = subject_id;
  delete from public.loopedin_reminder_drafts reminder where reminder.user_id = subject_id;
  delete from public.loopedin_notifications notification where notification.user_id = subject_id;
  delete from public.loopedin_group_members member where member.user_id = subject_id;
  delete from loopedin_private.loopedin_group_creation_entitlements entitlement where entitlement.user_id = subject_id;
  delete from public.loopedin_profiles profile where profile.id = subject_id;

  update loopedin_private.loopedin_account_purge_operations
  set status = 'relational_finalized', relational_finalized_at = now()
  where id = current_operation.id and status = 'prepared'
  returning * into current_operation;
  if current_operation.id is null then
    raise exception 'Relational purge conflict.' using errcode = '40001';
  end if;

  return jsonb_build_object(
    'operationId', current_operation.id,
    'status', current_operation.status,
    'planDigest', current_operation.plan_digest,
    'objectCount', current_operation.object_count
  );
end;
$$;

create or replace function public.loopedin_complete_account_purge(
  target_operation_id uuid,
  target_lease_owner text,
  target_plan_digest text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_operation loopedin_private.loopedin_account_purge_operations;
  subject_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required.' using errcode = '42501';
  end if;
  select * into current_operation
  from loopedin_private.loopedin_account_purge_operations operation
  where operation.id = target_operation_id
  for update;
  if current_operation.id is null then
    return jsonb_build_object('operationId', target_operation_id, 'status', 'already_completed');
  end if;
  if current_operation.status = 'completed' then
    return jsonb_build_object('operationId', current_operation.id, 'status', 'already_completed', 'planDigest', current_operation.plan_digest, 'objectCount', current_operation.object_count);
  end if;
  subject_id := current_operation.user_id;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(subject_id::text, 0));
  if current_operation.status <> 'relational_finalized'
     or current_operation.lease_owner <> target_lease_owner
     or current_operation.lease_expires_at <= now()
     or current_operation.plan_digest <> lower(target_plan_digest) then
    raise exception 'A finalized matching purge lease is required.' using errcode = '55P03';
  end if;
  if exists (select 1 from auth.users user_account where user_account.id = subject_id) then
    raise exception 'Delete the Auth user last before completing the purge.' using errcode = '23514';
  end if;

  delete from loopedin_private.loopedin_account_lifecycle_records record
  where record.user_id = subject_id;
  delete from loopedin_private.loopedin_account_legal_holds legal_hold
  where legal_hold.user_id = subject_id;
  delete from loopedin_private.loopedin_account_deletion_requests request
  where request.user_id = subject_id;

  update loopedin_private.loopedin_account_purge_operations
  set status = 'completed',
      request_id = null,
      user_id = null,
      lease_owner = null,
      lease_expires_at = null,
      frozen_plan = jsonb_build_object('counts', frozen_plan -> 'counts'),
      auth_deleted_at = now(),
      completed_at = now()
  where id = current_operation.id
  returning * into current_operation;

  return jsonb_build_object(
    'operationId', current_operation.id,
    'status', current_operation.status,
    'planDigest', current_operation.plan_digest,
    'objectCount', current_operation.object_count,
    'counts', current_operation.frozen_plan -> 'counts'
  );
end;
$$;

revoke all on function public.loopedin_lease_account_purge(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.loopedin_prepare_account_purge(uuid, text) from public, anon, authenticated;
revoke all on function public.loopedin_finalize_account_purge_relational(uuid, text, text) from public, anon, authenticated;
revoke all on function public.loopedin_complete_account_purge(uuid, text, text) from public, anon, authenticated;

grant execute on function public.loopedin_lease_account_purge(uuid, uuid, text) to service_role;
grant execute on function public.loopedin_prepare_account_purge(uuid, text) to service_role;
grant execute on function public.loopedin_finalize_account_purge_relational(uuid, text, text) to service_role;
grant execute on function public.loopedin_complete_account_purge(uuid, text, text) to service_role;
