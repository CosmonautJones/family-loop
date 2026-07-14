-- Forward-only media lifecycle. Postgres and Storage cannot share a transaction,
-- so incomplete work stays explicit and hidden until it can be retried safely.

alter table public.loopedin_event_media
  add column if not exists alt_text text,
  add column if not exists source_name text,
  add column if not exists source_url text,
  add column if not exists creator_name text,
  add column if not exists creator_url text,
  add column if not exists status text,
  add column if not exists delete_requested_by uuid references auth.users(id) on delete set null,
  add column if not exists delete_requested_at timestamptz;

update public.loopedin_event_media
set alt_text = coalesce(nullif(btrim(alt_text), ''), nullif(btrim(caption), ''), 'Shared family photo'),
    caption = coalesce(caption, ''),
    status = coalesce(status, 'active');

alter table public.loopedin_event_media
  alter column caption set default '',
  alter column caption set not null,
  alter column alt_text set default 'Shared family photo',
  alter column alt_text set not null,
  alter column status set default 'pending',
  alter column status set not null;

alter table public.loopedin_event_media
  drop constraint if exists loopedin_event_media_event_id_fkey,
  drop constraint if exists loopedin_event_media_alt_text_present,
  drop constraint if exists loopedin_event_media_caption_length,
  drop constraint if exists loopedin_event_media_alt_text_length,
  drop constraint if exists loopedin_event_media_attribution_complete,
  drop constraint if exists loopedin_event_media_status_valid,
  drop constraint if exists loopedin_event_media_delete_request_valid,
  add constraint loopedin_event_media_event_id_fkey
    foreign key (event_id) references public.loopedin_events(id) on delete restrict,
  add constraint loopedin_event_media_alt_text_present
    check (btrim(alt_text) <> '' and char_length(btrim(alt_text)) <= 1000) not valid,
  add constraint loopedin_event_media_caption_length
    check (char_length(btrim(caption)) <= 1000) not valid,
  add constraint loopedin_event_media_attribution_complete
    check (
      (source_name is null and source_url is null and creator_name is null and creator_url is null)
      or (
        nullif(btrim(source_name), '') is not null
        and char_length(btrim(source_name)) <= 200
        and source_url ~ '^https://'
        and char_length(source_url) <= 2048
        and nullif(btrim(creator_name), '') is not null
        and char_length(btrim(creator_name)) <= 200
        and (creator_url is null or (creator_url ~ '^https://' and char_length(creator_url) <= 2048))
      )
    ) not valid,
  add constraint loopedin_event_media_status_valid
    check (status in ('pending', 'active', 'deleting')),
  add constraint loopedin_event_media_delete_request_valid
    check (
      (status = 'deleting') = (delete_requested_by is not null)
      and (status = 'deleting') = (delete_requested_at is not null)
    );

create index if not exists loopedin_event_media_event_id_idx
  on public.loopedin_event_media(event_id);
create index if not exists loopedin_event_media_uploaded_by_idx
  on public.loopedin_event_media(uploaded_by);

create or replace function loopedin_private.media_path_is_owned(
  target_event_id uuid,
  target_storage_path text,
  target_user_id uuid
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select loopedin_private.storage_event_id(target_storage_path) = target_event_id
    and array_length(storage.foldername(target_storage_path), 1) = 2
    and (storage.foldername(target_storage_path))[2] = target_user_id::text
    and lower(storage.extension(target_storage_path)) in ('jpg', 'jpeg', 'png', 'webp');
$$;

create or replace function loopedin_private.can_read_media_object(target_storage_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
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
  select exists (
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

create or replace function loopedin_private.has_pending_media_object(target_storage_path text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed boolean;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_storage_path, 0));
  select exists (
    select 1
    from public.loopedin_event_media media
    where media.storage_path = target_storage_path
      and media.uploaded_by = (select auth.uid())
      and media.status = 'pending'
      and loopedin_private.is_event_member(media.event_id)
  ) into allowed;
  return allowed;
end;
$$;

create or replace function public.loopedin_begin_media_upload(
  target_event_id uuid,
  target_storage_path text,
  target_caption text,
  target_alt_text text,
  target_source_name text default null,
  target_source_url text default null,
  target_creator_name text default null,
  target_creator_url text default null
)
returns public.loopedin_event_media
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  created public.loopedin_event_media;
begin
  if actor is null or not loopedin_private.is_event_member(target_event_id) then
    raise exception 'Not authorized to add media to this plan';
  end if;
  if not loopedin_private.media_path_is_owned(target_event_id, target_storage_path, actor) then
    raise exception 'Invalid media object path';
  end if;
  if (
    select count(*) from public.loopedin_event_media
    where event_id = target_event_id and uploaded_by = actor and status = 'pending'
  ) >= 3 then
    raise exception 'Too many unfinished media uploads';
  end if;

  insert into public.loopedin_event_media (
    event_id, storage_path, caption, alt_text, source_name, source_url,
    creator_name, creator_url, uploaded_by, status
  ) values (
    target_event_id, target_storage_path, btrim(coalesce(target_caption, '')),
    btrim(target_alt_text), nullif(btrim(target_source_name), ''),
    nullif(btrim(target_source_url), ''), nullif(btrim(target_creator_name), ''),
    nullif(btrim(target_creator_url), ''), actor, 'pending'
  ) returning * into created;
  return created;
end;
$$;

create or replace function public.loopedin_activate_media(target_media_id uuid)
returns public.loopedin_event_media
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_media public.loopedin_event_media;
begin
  select * into current_media
  from public.loopedin_event_media
  where id = target_media_id;
  if current_media.id is null or actor is null
    or not loopedin_private.is_event_member(current_media.event_id)
    or (current_media.uploaded_by <> actor and not exists (
      select 1 from public.loopedin_events event
      where event.id = current_media.event_id
        and loopedin_private.can_manage_group(event.group_id)
    )) then raise exception 'Media upload not found'; end if;
  if current_media.status = 'active' then return current_media; end if;
  if current_media.status <> 'pending' then raise exception 'Media upload cannot be activated'; end if;
  if not exists (
    select 1 from storage.objects object
    where object.bucket_id = 'loopedin-event-media'
      and object.name = current_media.storage_path
      and object.owner_id = current_media.uploaded_by::text
  ) then raise exception 'Media object is not present'; end if;

  update public.loopedin_event_media set status = 'active'
  where id = target_media_id and status = 'pending'
  returning * into current_media;
  if current_media.id is null then raise exception 'Media activation conflict'; end if;
  return current_media;
end;
$$;

create or replace function public.loopedin_abort_media_upload(target_media_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_media public.loopedin_event_media;
begin
  select * into current_media from public.loopedin_event_media where id = target_media_id;
  if current_media.id is null or actor is null
    or not loopedin_private.is_event_member(current_media.event_id)
    or (current_media.uploaded_by <> actor and not exists (
      select 1 from public.loopedin_events event
      where event.id = current_media.event_id
        and loopedin_private.can_manage_group(event.group_id)
    )) then raise exception 'Media upload not found'; end if;
  if current_media.status <> 'pending' then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(current_media.storage_path, 0));
  if exists (
    select 1 from storage.objects object
    where object.bucket_id = 'loopedin-event-media' and object.name = current_media.storage_path
  ) then raise exception 'Media object still exists'; end if;
  delete from public.loopedin_event_media where id = target_media_id and status = 'pending';
  return found;
end;
$$;

create or replace function public.loopedin_list_media_operations(target_event_id uuid)
returns setof public.loopedin_event_media
language sql
stable
security definer
set search_path = ''
as $$
  select media.*
  from public.loopedin_event_media media
  join public.loopedin_events event on event.id = media.event_id
  where media.event_id = target_event_id
    and media.status in ('pending', 'deleting')
    and loopedin_private.is_event_member(target_event_id)
    and (
      media.uploaded_by = (select auth.uid())
      or media.delete_requested_by = (select auth.uid())
      or loopedin_private.can_manage_group(event.group_id)
    );
$$;

create or replace function public.loopedin_claim_media_deletion(target_media_id uuid)
returns public.loopedin_event_media
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_media public.loopedin_event_media;
  group_id uuid;
begin
  select * into current_media
  from public.loopedin_event_media
  where id = target_media_id
  for update;
  select event.group_id into group_id
  from public.loopedin_events event
  where event.id = current_media.event_id;
  if current_media.id is null or actor is null
    or not loopedin_private.is_event_member(current_media.event_id)
    or (current_media.uploaded_by <> actor and not loopedin_private.can_manage_group(group_id)) then
    raise exception 'Not authorized to remove this media';
  end if;
  if current_media.status not in ('active', 'deleting') then
    raise exception 'Media is not ready for deletion';
  end if;

  if current_media.status = 'deleting'
    and current_media.delete_requested_by <> actor
    and (current_media.delete_requested_at > now() - interval '5 minutes'
      or not loopedin_private.can_manage_group(group_id)) then
    raise exception 'Media deletion is already in progress';
  end if;

  update public.loopedin_event_media
  set status = 'deleting', delete_requested_by = actor, delete_requested_at = now()
  where id = target_media_id
    and (status = 'active' or delete_requested_by = actor
      or delete_requested_at <= now() - interval '5 minutes')
  returning * into current_media;
  if current_media.id is null then raise exception 'Media deletion conflict'; end if;
  return current_media;
end;
$$;

create or replace function public.loopedin_finalize_media_deletion(target_media_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_media public.loopedin_event_media;
begin
  select * into current_media from public.loopedin_event_media
  where id = target_media_id and status = 'deleting' and delete_requested_by = actor;
  if current_media.id is null then raise exception 'Claimed media deletion not found'; end if;
  if exists (
    select 1 from storage.objects object
    where object.bucket_id = 'loopedin-event-media' and object.name = current_media.storage_path
  ) then raise exception 'Media object still exists'; end if;

  delete from public.loopedin_event_media
  where id = target_media_id and status = 'deleting' and delete_requested_by = actor;
  if not found then raise exception 'Media deletion conflict'; end if;
  return true;
end;
$$;

revoke all on function loopedin_private.media_path_is_owned(uuid, text, uuid) from public;
revoke all on function loopedin_private.has_pending_media_object(text) from public;
revoke all on function loopedin_private.can_read_media_object(text) from public;
revoke all on function loopedin_private.can_delete_claimed_media_object(text, text) from public;
revoke all on function public.loopedin_begin_media_upload(uuid, text, text, text, text, text, text, text) from public;
revoke all on function public.loopedin_activate_media(uuid) from public;
revoke all on function public.loopedin_abort_media_upload(uuid) from public;
revoke all on function public.loopedin_list_media_operations(uuid) from public;
revoke all on function public.loopedin_claim_media_deletion(uuid) from public;
revoke all on function public.loopedin_finalize_media_deletion(uuid) from public;
grant execute on function loopedin_private.media_path_is_owned(uuid, text, uuid) to authenticated;
grant execute on function loopedin_private.has_pending_media_object(text) to authenticated;
grant execute on function loopedin_private.can_read_media_object(text) to authenticated;
grant execute on function loopedin_private.can_delete_claimed_media_object(text, text) to authenticated;
grant execute on function public.loopedin_begin_media_upload(uuid, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.loopedin_activate_media(uuid) to authenticated;
grant execute on function public.loopedin_abort_media_upload(uuid) to authenticated;
grant execute on function public.loopedin_list_media_operations(uuid) to authenticated;
grant execute on function public.loopedin_claim_media_deletion(uuid) to authenticated;
grant execute on function public.loopedin_finalize_media_deletion(uuid) to authenticated;

revoke insert, update, delete on public.loopedin_event_media from authenticated;
grant select on public.loopedin_event_media to authenticated;

drop policy if exists "media_select_event_member" on public.loopedin_event_media;
create policy "media_select_active_event_member" on public.loopedin_event_media
for select to authenticated
using (status = 'active' and loopedin_private.is_event_member(event_id));
drop policy if exists "media_insert_self" on public.loopedin_event_media;
drop policy if exists "media_insert_owned_object" on public.loopedin_event_media;
drop policy if exists "media_delete_uploader_or_manager" on public.loopedin_event_media;

drop policy if exists "loopedin_media_select_event_members" on storage.objects;
create policy "loopedin_media_select_active_or_claimed" on storage.objects
for select to authenticated
using (
  bucket_id = 'loopedin-event-media'
  and loopedin_private.can_read_media_object(name)
);

drop policy if exists "loopedin_media_insert_event_members" on storage.objects;
create policy "loopedin_media_insert_pending_owner" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'loopedin-event-media'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  and loopedin_private.has_pending_media_object(name)
);

drop policy if exists "loopedin_media_update_event_members" on storage.objects;
drop policy if exists "loopedin_media_update_owner_or_manager" on storage.objects;

drop policy if exists "loopedin_media_delete_event_members" on storage.objects;
drop policy if exists "loopedin_media_delete_owner_or_manager" on storage.objects;
create policy "loopedin_media_delete_claimed" on storage.objects
for delete to authenticated
using (
  bucket_id = 'loopedin-event-media'
  and loopedin_private.can_delete_claimed_media_object(name, owner_id)
);

update storage.buckets
set file_size_limit = 1048576,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'loopedin-event-media';
