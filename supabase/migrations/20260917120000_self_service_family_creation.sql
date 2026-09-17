-- Public registration grants one family only after authoritative email verification.
-- Preserve historical consumption, including founders who predate entitlements.
insert into loopedin_private.loopedin_group_creation_entitlements as entitlement
  (user_id, consumed_at, group_id)
select distinct on (created_by) created_by, created_at, id
from public.loopedin_groups
where created_by is not null
order by created_by, created_at, id
on conflict (user_id) do update
set consumed_at = coalesce(entitlement.consumed_at, excluded.consumed_at),
    group_id = coalesce(entitlement.group_id, excluded.group_id);

create or replace function public.loopedin_can_create_group()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  perform loopedin_private.require_active_account();
  return exists (
    select 1 from auth.users account
    where account.id = actor_id
      and account.email_confirmed_at is not null
      and nullif(btrim(account.email), '') is not null
  ) and not exists (
    select 1 from loopedin_private.loopedin_group_creation_entitlements entitlement
    where entitlement.user_id = actor_id and entitlement.consumed_at is not null
  ) and not exists (
    select 1 from public.loopedin_groups where created_by = actor_id
  );
end;
$$;

create or replace function public.loopedin_create_group(
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
  if not exists (
    select 1 from auth.users account
    where account.id = actor_id
      and account.email_confirmed_at is not null
      and nullif(btrim(account.email), '') is not null
  ) then
    raise exception 'Confirm your email before creating a family.' using errcode = '42501';
  end if;

  -- The actor lock serializes different creation keys. Provision and consume in
  -- the same transaction; failed validation cannot leave a partial family.
  insert into loopedin_private.loopedin_group_creation_entitlements(user_id)
  select actor_id
  where not exists (select 1 from public.loopedin_groups where created_by = actor_id)
  on conflict (user_id) do nothing;

  -- The existing implementation validates details, handles same-key retries,
  -- consumes the entitlement and creates exactly one owner atomically.
  return public.loopedin_create_group_active_impl(target_name, target_description, target_kind, target_creation_key);
end;
$$;

revoke all on function public.loopedin_can_create_group() from public, anon;
revoke all on function public.loopedin_create_group(text, text, text, uuid) from public, anon;
grant execute on function public.loopedin_can_create_group() to authenticated;
grant execute on function public.loopedin_create_group(text, text, text, uuid) to authenticated;
