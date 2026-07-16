create table loopedin_private.loopedin_invitation_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.loopedin_group_invitations(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete restrict,
  operation_key uuid not null,
  status text not null default 'prepared'
    check (status in ('prepared', 'provider_accepted', 'provider_failed')),
  prepared_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  attempt_count integer not null default 1 check (attempt_count between 1 and 5),
  finalized_at timestamptz,
  unique (requested_by, operation_key),
  check (
    (status = 'prepared' and finalized_at is null)
    or (status in ('provider_accepted', 'provider_failed') and finalized_at is not null)
  )
);

create index loopedin_invitation_email_deliveries_invite_time_idx
on loopedin_private.loopedin_invitation_email_deliveries (invitation_id, last_attempt_at desc);

revoke all on loopedin_private.loopedin_invitation_email_deliveries
from public, anon, authenticated, service_role;

create function public.loopedin_prepare_invitation_email(
  target_invitation_id uuid,
  target_token text,
  target_operation_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  actor_id uuid := auth.uid();
  normalized_token text := lower(btrim(coalesce(target_token, '')));
  requested_hash bytea;
  matching public.loopedin_group_invitations;
  delivery loopedin_private.loopedin_invitation_email_deliveries;
  group_name text;
  inviter_name text;
  recent_delivery_at timestamptz;
  actor_attempts integer;
  group_attempts integer;
begin
  perform loopedin_private.require_active_account();
  if actor_id is null or target_invitation_id is null or target_operation_key is null
     or normalized_token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'code', 'unavailable');
  end if;
  requested_hash := extensions.digest(decode(normalized_token, 'hex'), 'sha256');

  select * into matching
  from public.loopedin_group_invitations invitation
  where invitation.id = target_invitation_id
  for update;

  if matching.id is null or matching.token_hash <> requested_hash
     or matching.status <> 'pending' or matching.expires_at <= now()
     or not exists (
       select 1 from public.loopedin_group_members member
       where member.group_id = matching.group_id
         and member.user_id = actor_id
         and member.role = 'owner'
     ) then
    return jsonb_build_object('ok', false, 'code', 'unavailable');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('loopedin-invitation-email-actor:' || actor_id::text, 0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('loopedin-invitation-email-group:' || matching.group_id::text, 0));

  select coalesce(sum(item.attempt_count), 0)::integer into actor_attempts
  from loopedin_private.loopedin_invitation_email_deliveries item
  where item.requested_by = actor_id
    and item.last_attempt_at > now() - interval '24 hours';
  select coalesce(sum(item.attempt_count), 0)::integer into group_attempts
  from loopedin_private.loopedin_invitation_email_deliveries item
  join public.loopedin_group_invitations invitation on invitation.id = item.invitation_id
  where invitation.group_id = matching.group_id
    and item.last_attempt_at > now() - interval '24 hours';

  select * into delivery
  from loopedin_private.loopedin_invitation_email_deliveries item
  where item.requested_by = actor_id and item.operation_key = target_operation_key;

  if delivery.id is not null then
    if delivery.invitation_id <> matching.id then
      return jsonb_build_object('ok', false, 'code', 'unavailable');
    end if;
    if delivery.status = 'provider_accepted' then
      return jsonb_build_object('ok', true, 'code', 'provider_accepted');
    end if;
    if delivery.status = 'prepared' and delivery.last_attempt_at <= now() - interval '24 hours' then
      return jsonb_build_object('ok', false, 'code', 'operator_review');
    end if;
    if delivery.status = 'provider_failed' then
      if delivery.last_attempt_at > now() - interval '60 seconds' then
        return jsonb_build_object('ok', false, 'code', 'cooldown', 'retryAfterSeconds', 60);
      end if;
      if delivery.last_attempt_at > now() - interval '24 hours' and delivery.attempt_count >= 5 then
        return jsonb_build_object('ok', false, 'code', 'rate_limited', 'retryAfterSeconds', 3600);
      end if;
      if actor_attempts >= 20 or group_attempts >= 20 then
        return jsonb_build_object('ok', false, 'code', 'rate_limited', 'retryAfterSeconds', 3600);
      end if;
      update loopedin_private.loopedin_invitation_email_deliveries
      set status = 'prepared',
        last_attempt_at = now(),
        attempt_count = case when last_attempt_at <= now() - interval '24 hours' then 1 else attempt_count + 1 end,
        finalized_at = null
      where id = delivery.id
      returning * into delivery;
    end if;
  else
    if actor_attempts >= 20 or group_attempts >= 20 then
      return jsonb_build_object('ok', false, 'code', 'rate_limited', 'retryAfterSeconds', 3600);
    end if;
    select item.last_attempt_at into recent_delivery_at
    from loopedin_private.loopedin_invitation_email_deliveries item
    where item.invitation_id = matching.id
      and item.last_attempt_at > now() - interval '60 seconds'
    order by item.last_attempt_at desc
    limit 1;
    if recent_delivery_at is not null then
      return jsonb_build_object(
        'ok', false,
        'code', 'cooldown',
        'retryAfterSeconds', greatest(1, ceil(extract(epoch from (recent_delivery_at + interval '60 seconds' - now())))::integer)
      );
    end if;
    if (
      select count(*)
      from loopedin_private.loopedin_invitation_email_deliveries item
      where item.invitation_id = matching.id
        and item.last_attempt_at > now() - interval '24 hours'
    ) >= 5 then
      return jsonb_build_object('ok', false, 'code', 'rate_limited', 'retryAfterSeconds', 3600);
    end if;
    insert into loopedin_private.loopedin_invitation_email_deliveries
      (invitation_id, requested_by, operation_key)
    values (matching.id, actor_id, target_operation_key)
    returning * into delivery;
  end if;

  select grp.name, coalesce(profile.display_name, 'Family organizer')
  into group_name, inviter_name
  from public.loopedin_groups grp
  left join public.loopedin_profiles profile on profile.id = actor_id
  where grp.id = matching.group_id;

  return jsonb_build_object(
    'ok', true,
    'code', 'prepared',
    'deliveryId', delivery.id,
    'inviteeEmail', matching.invitee_email,
    'groupName', group_name,
    'inviterName', inviter_name
  );
end;
$$;

create function public.loopedin_finalize_invitation_email(
  target_delivery_id uuid,
  target_token text,
  target_outcome text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  actor_id uuid := auth.uid();
  normalized_token text := lower(btrim(coalesce(target_token, '')));
  requested_hash bytea;
  delivery loopedin_private.loopedin_invitation_email_deliveries;
  matching public.loopedin_group_invitations;
begin
  perform loopedin_private.require_active_account();
  if actor_id is null or target_delivery_id is null
     or normalized_token !~ '^[0-9a-f]{64}$'
     or target_outcome not in ('provider_accepted', 'provider_failed') then
    return jsonb_build_object('ok', false, 'code', 'unavailable');
  end if;
  requested_hash := extensions.digest(decode(normalized_token, 'hex'), 'sha256');

  select * into delivery
  from loopedin_private.loopedin_invitation_email_deliveries item
  where item.id = target_delivery_id and item.requested_by = actor_id
  for update;
  if delivery.id is null then
    return jsonb_build_object('ok', false, 'code', 'unavailable');
  end if;

  select * into matching
  from public.loopedin_group_invitations invitation
  where invitation.id = delivery.invitation_id
  for update;
  if matching.id is null or matching.token_hash <> requested_hash
     or matching.status <> 'pending' or matching.expires_at <= now()
     or not exists (
       select 1 from public.loopedin_group_members member
       where member.group_id = matching.group_id
         and member.user_id = actor_id
         and member.role = 'owner'
     ) then
    return jsonb_build_object('ok', false, 'code', 'unavailable');
  end if;

  if delivery.status = 'provider_accepted' then
    return jsonb_build_object('ok', true, 'code', 'provider_accepted');
  end if;
  update loopedin_private.loopedin_invitation_email_deliveries
  set status = target_outcome, finalized_at = now()
  where id = delivery.id;
  return jsonb_build_object('ok', true, 'code', target_outcome);
end;
$$;

revoke all on function public.loopedin_prepare_invitation_email(uuid, text, uuid) from public, anon;
revoke all on function public.loopedin_finalize_invitation_email(uuid, text, text) from public, anon;
grant execute on function public.loopedin_prepare_invitation_email(uuid, text, uuid) to authenticated;
grant execute on function public.loopedin_finalize_invitation_email(uuid, text, text) to authenticated;
