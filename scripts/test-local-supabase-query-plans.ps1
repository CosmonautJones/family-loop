$ErrorActionPreference = 'Stop'

$container = 'supabase_db_family-loop'
$running = docker inspect -f '{{.State.Running}}' $container 2>$null
if ($LASTEXITCODE -ne 0 -or $running -ne 'true') {
  throw 'Local Supabase database is not running. Run npx supabase start first.'
}

$baselineQuery = @'
select concat_ws(',',
  (select count(*) from public.loopedin_profiles),
  (select count(*) from public.loopedin_groups),
  (select count(*) from public.loopedin_group_members),
  (select count(*) from public.loopedin_events),
  (select count(*) from public.loopedin_rsvps),
  (select count(*) from public.loopedin_event_messages),
  (select count(*) from public.loopedin_event_media),
  (select count(*) from public.loopedin_notifications),
  (select count(*) from public.loopedin_reminder_drafts)
);
'@

function Read-Baseline {
  $value = docker exec $container psql -X -U postgres -d postgres -Atc $baselineQuery
  if ($LASTEXITCODE -ne 0) { throw 'Could not read the local database baseline.' }
  return ($value | Select-Object -Last 1).Trim()
}

$before = Read-Baseline
$sql = @'
\set ON_ERROR_STOP on
begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  md5('opord006-plan-user-' || member_number)::uuid,
  'authenticated', 'authenticated',
  'opord006-plan-user-' || member_number || '@loopedin.test',
  'query-plan-only', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('display_name', 'Plan member ' || member_number),
  now(), now()
from generate_series(1, 20) member_number;

insert into public.loopedin_groups (id, name, description, kind, created_by)
values (
  md5('opord006-plan-group')::uuid,
  'OPORD 006 rollback family',
  'Transaction-only representative query-plan data',
  'family',
  md5('opord006-plan-user-1')::uuid
);

insert into public.loopedin_group_members (group_id, user_id, role)
select
  md5('opord006-plan-group')::uuid,
  md5('opord006-plan-user-' || member_number)::uuid,
  case when member_number = 1 then 'owner' else 'member' end
from generate_series(1, 20) member_number;

insert into public.loopedin_events (
  id, group_id, title, starts_at, ends_at, location, description,
  status_label, visibility, timeline, created_by
)
select
  md5('opord006-plan-event-' || event_number)::uuid,
  md5('opord006-plan-group')::uuid,
  'Representative plan ' || event_number,
  timestamptz '2026-08-01 15:00:00+00' + event_number * interval '1 day',
  timestamptz '2026-08-01 17:00:00+00' + event_number * interval '1 day',
  'Family room', 'Rollback-only query-plan fixture', 'Open', 'group', '[]'::jsonb,
  md5('opord006-plan-user-1')::uuid
from generate_series(1, 100) event_number;

insert into public.loopedin_rsvps (event_id, user_id, person_name, status)
select
  md5('opord006-plan-event-1')::uuid,
  md5('opord006-plan-user-' || member_number)::uuid,
  'Plan member ' || member_number,
  case when member_number % 3 = 0 then 'maybe' when member_number % 3 = 1 then 'going' else 'declined' end
from generate_series(1, 20) member_number;

insert into public.loopedin_event_messages (id, event_id, author_id, body, created_at)
select
  md5('opord006-plan-message-' || message_number)::uuid,
  md5('opord006-plan-event-1')::uuid,
  md5('opord006-plan-user-' || (1 + (message_number % 20)))::uuid,
  'Representative family comment ' || message_number,
  timestamptz '2026-08-01 18:00:00+00' + message_number * interval '1 minute'
from generate_series(1, 100) message_number;

insert into public.loopedin_event_media (
  id, event_id, storage_path, caption, alt_text, uploaded_by, uploaded_at, status
)
select
  md5('opord006-plan-media-' || media_number)::uuid,
  md5('opord006-plan-event-1')::uuid,
  md5('opord006-plan-event-1') || '/' || md5('opord006-plan-user-1') || '/plan-' || media_number || '.jpg',
  'Representative photo ' || media_number,
  'Family gathering photo ' || media_number,
  md5('opord006-plan-user-1')::uuid,
  timestamptz '2026-08-02 12:00:00+00' + media_number * interval '1 minute',
  'active'
from generate_series(1, 50) media_number;

insert into public.loopedin_reminder_drafts (event_id, user_id, body, enabled)
select
  md5('opord006-plan-event-1')::uuid,
  md5('opord006-plan-user-' || member_number)::uuid,
  'Morning of event', true
from generate_series(1, 20) member_number;

analyze public.loopedin_group_members;
analyze public.loopedin_events;
analyze public.loopedin_rsvps;
analyze public.loopedin_event_messages;
analyze public.loopedin_event_media;
analyze public.loopedin_notifications;
analyze public.loopedin_reminder_drafts;

select set_config('request.jwt.claim.sub', md5('opord006-plan-user-2')::uuid::text, true);
select set_config('request.jwt.claim.role', 'authenticated', true);
do $membership$
begin
  if not loopedin_private.is_group_member(md5('opord006-plan-group')::uuid)
    or not loopedin_private.is_event_member(md5('opord006-plan-event-1')::uuid) then
    raise exception 'Representative member was denied by membership helpers';
  end if;
  perform set_config('request.jwt.claim.sub', md5('opord006-plan-outsider')::uuid::text, true);
  if loopedin_private.is_group_member(md5('opord006-plan-group')::uuid)
    or loopedin_private.is_event_member(md5('opord006-plan-event-1')::uuid) then
    raise exception 'Representative outsider passed a membership helper';
  end if;
  perform set_config('request.jwt.claim.sub', md5('opord006-plan-user-2')::uuid::text, true);
end;
$membership$;

create temporary table plan_evidence (
  query_name text primary key,
  expected_rows integer not null,
  plan jsonb not null
);

create function pg_temp.capture_plan(query_name text, expected_rows integer, statement text)
returns void
language plpgsql
as $function$
declare captured jsonb;
begin
  execute 'explain (analyze, buffers, format json) ' || statement into captured;
  insert into plan_evidence values (query_name, expected_rows, captured);
end;
$function$;

select pg_temp.capture_plan(
  'exact_event_lookup', 1,
  $query$select id, group_id from public.loopedin_events where id = md5('opord006-plan-event-1')::uuid$query$
);
select pg_temp.capture_plan(
  'group_events_order', 100,
  $query$select id, starts_at from public.loopedin_events where group_id = md5('opord006-plan-group')::uuid order by starts_at asc$query$
);
select pg_temp.capture_plan(
  'exact_event_messages', 100,
  $query$select id, created_at from public.loopedin_event_messages where event_id = md5('opord006-plan-event-1')::uuid order by created_at asc, id asc$query$
);
select pg_temp.capture_plan(
  'exact_event_media', 50,
  $query$select id, uploaded_at from public.loopedin_event_media where event_id = md5('opord006-plan-event-1')::uuid and status = 'active' order by uploaded_at desc$query$
);
select pg_temp.capture_plan(
  'exact_event_rsvps', 20,
  $query$select event_id, user_id from public.loopedin_rsvps where event_id = md5('opord006-plan-event-1')::uuid$query$
);
select pg_temp.capture_plan(
  'user_notifications', 214,
  $query$select id, created_at from public.loopedin_notifications where user_id = md5('opord006-plan-user-2')::uuid order by created_at desc$query$
);
select pg_temp.capture_plan(
  'exact_reminder', 1,
  $query$select event_id, user_id from public.loopedin_reminder_drafts where event_id = md5('opord006-plan-event-1')::uuid and user_id = md5('opord006-plan-user-2')::uuid and enabled = true$query$
);
select pg_temp.capture_plan(
  'membership_pk_path', 1,
  $query$select 1 from public.loopedin_group_members where group_id = md5('opord006-plan-group')::uuid and user_id = md5('opord006-plan-user-2')::uuid$query$
);
select pg_temp.capture_plan(
  'event_membership_helper', 1,
  $query$select loopedin_private.is_event_member(md5('opord006-plan-event-1')::uuid)$query$
);
select pg_temp.capture_plan(
  'group_membership_helper', 1,
  $query$select loopedin_private.is_group_member(md5('opord006-plan-group')::uuid)$query$
);

do $assert$
declare mismatch text;
begin
  select string_agg(query_name || '=' || (plan->0->'Plan'->>'Actual Rows'), ', ' order by query_name)
  into mismatch
  from plan_evidence
  where (plan->0->'Plan'->>'Actual Rows')::integer <> expected_rows;
  if mismatch is not null then
    raise exception 'Unexpected bounded query result: %', mismatch;
  end if;
  select string_agg(query_name || '=' || (plan->0->>'Execution Time') || 'ms', ', ' order by query_name)
  into mismatch
  from plan_evidence
  where (plan->0->>'Execution Time')::numeric >= 100;
  if mismatch is not null then
    raise exception 'Representative query exceeded 100ms: %', mismatch;
  end if;
end;
$assert$;

\pset format unaligned
\pset fieldsep '|'
\pset tuples_only on
select 'PLAN', query_name,
  plan->0->'Plan'->>'Node Type',
  coalesce(plan->0->'Plan'->>'Index Name', '-'),
  plan->0->'Plan'->>'Actual Rows',
  plan->0->'Plan'->>'Actual Total Time',
  plan->0->>'Execution Time'
from plan_evidence
order by query_name;

with recursive nodes(query_name, node) as (
  select query_name, plan->0->'Plan' from plan_evidence
  union all
  select nodes.query_name, child.node
  from nodes
  cross join lateral jsonb_array_elements(coalesce(nodes.node->'Plans', '[]'::jsonb)) child(node)
)
select 'NODE', query_name,
  node->>'Node Type',
  coalesce(node->>'Relation Name', '-'),
  coalesce(node->>'Index Name', '-'),
  node->>'Actual Rows'
from nodes
where node->>'Node Type' in ('Seq Scan', 'Index Scan', 'Index Only Scan', 'Bitmap Index Scan', 'Sort')
order by query_name, node->>'Node Type', coalesce(node->>'Relation Name', '');

rollback;
'@

$output = $sql | docker exec -i $container psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -q
$planSucceeded = $LASTEXITCODE -eq 0

$restoreStatistics = @'
vacuum (analyze) auth.users;
vacuum (analyze) public.loopedin_profiles;
vacuum (analyze) public.loopedin_groups;
vacuum (analyze) public.loopedin_group_members;
vacuum (analyze) public.loopedin_events;
vacuum (analyze) public.loopedin_rsvps;
vacuum (analyze) public.loopedin_event_messages;
vacuum (analyze) public.loopedin_event_media;
vacuum (analyze) public.loopedin_notifications;
vacuum (analyze) public.loopedin_reminder_drafts;
'@
$restoreStatistics | docker exec -i $container psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -q
if ($LASTEXITCODE -ne 0) { throw 'Fixture rows rolled back, but retained planner statistics could not be refreshed.' }
if (-not $planSucceeded) { throw 'Representative query-plan transaction failed; retained planner statistics were refreshed.' }

$after = Read-Baseline
if ($after -ne $before) {
  throw "Rollback changed the retained baseline: before=$before after=$after"
}

$planLines = @($output | Where-Object { $_ -match '^(PLAN|NODE)\|' })
if ($planLines.Count -lt 10) { throw 'Expected query-plan evidence was not emitted.' }
$planLines
"Query-plan rows rolled back, dead fixture tuples removed, retained statistics refreshed, and baseline unchanged: $after"
