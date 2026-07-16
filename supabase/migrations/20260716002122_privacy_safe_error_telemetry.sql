create schema if not exists loopedin_telemetry;

revoke all on schema loopedin_telemetry from public, anon, authenticated;

create table loopedin_telemetry.configuration (
  singleton boolean primary key default true check (singleton),
  environment text not null check (environment in ('loopedin-staging', 'loopedin-production'))
);

create table loopedin_telemetry.client_error_events (
  occurred_at timestamptz not null default now(),
  environment text not null check (environment in ('loopedin-staging', 'loopedin-production')),
  operation text not null check (operation in ('auth', 'data', 'media', 'render')),
  category text not null check (category in ('network', 'session', 'access', 'conflict', 'rate-limit', 'unknown', 'render')),
  release text not null check (release ~ '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}-[0-9a-f]{12}$'),
  check ((operation = 'render') = (category = 'render'))
);

create table loopedin_telemetry.client_error_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket_start timestamptz not null,
  request_count smallint not null check (request_count between 1 and 5),
  primary key (user_id, bucket_start)
);

create index client_error_events_occurred_at_idx
on loopedin_telemetry.client_error_events (occurred_at);

create index client_error_rate_limits_bucket_start_idx
on loopedin_telemetry.client_error_rate_limits (bucket_start);

revoke all on all tables in schema loopedin_telemetry from public, anon, authenticated;

create or replace function public.loopedin_report_client_error(
  target_operation text,
  target_category text,
  target_release text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  configured_environment text;
  current_bucket timestamptz := date_bin('15 minutes', now(), timestamptz '2000-01-01 00:00:00+00');
  accepted boolean := false;
begin
  select configuration.environment into configured_environment
  from loopedin_telemetry.configuration
  where singleton;

  if caller_id is null
    or configured_environment is null
    or target_operation is null or target_operation not in ('auth', 'data', 'media', 'render')
    or target_category is null or target_category not in ('network', 'session', 'access', 'conflict', 'rate-limit', 'unknown', 'render')
    or target_release is null or target_release !~ '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}-[0-9a-f]{12}$'
    or ((target_operation = 'render') <> (target_category = 'render'))
  then
    return false;
  end if;

  insert into loopedin_telemetry.client_error_rate_limits (user_id, bucket_start, request_count)
  values (caller_id, current_bucket, 1)
  on conflict (user_id, bucket_start) do update
  set request_count = loopedin_telemetry.client_error_rate_limits.request_count + 1
  where loopedin_telemetry.client_error_rate_limits.request_count < 5
  returning true into accepted;

  if not coalesce(accepted, false) then
    return false;
  end if;

  insert into loopedin_telemetry.client_error_events (environment, operation, category, release)
  values (configured_environment, target_operation, target_category, target_release);

  return true;
end;
$$;

create or replace function public.loopedin_maintain_client_error_telemetry()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  configured_environment text;
  purged_events bigint;
  purged_rate_limits bigint;
  result jsonb;
begin
  select configuration.environment into configured_environment
  from loopedin_telemetry.configuration
  where singleton;
  if configured_environment is null then
    raise exception 'LoopedIn telemetry environment is not configured.';
  end if;

  delete from loopedin_telemetry.client_error_events
  where occurred_at < now() - interval '30 days';
  get diagnostics purged_events = row_count;

  delete from loopedin_telemetry.client_error_rate_limits
  where bucket_start < now() - interval '24 hours';
  get diagnostics purged_rate_limits = row_count;

  select jsonb_build_object(
    'environment', configured_environment,
    'checkedAt', now(),
    'lastHourTotal', count(*),
    'lastHourNetwork', count(*) filter (where category = 'network'),
    'lastHourSession', count(*) filter (where category = 'session'),
    'lastHourAccess', count(*) filter (where category = 'access'),
    'lastHourConflict', count(*) filter (where category = 'conflict'),
    'lastHourRateLimit', count(*) filter (where category = 'rate-limit'),
    'lastHourUnknown', count(*) filter (where category = 'unknown'),
    'lastHourRender', count(*) filter (where category = 'render'),
    'distinctReleases', count(distinct release),
    'releaseCounts', coalesce((
      select jsonb_object_agg(release_counts.release, release_counts.total)
      from (
        select release, count(*) as total
        from loopedin_telemetry.client_error_events
        where occurred_at >= now() - interval '1 hour'
        group by release
      ) release_counts
    ), '{}'::jsonb),
    'purgedEvents', purged_events,
    'purgedRateLimits', purged_rate_limits
  ) into result
  from loopedin_telemetry.client_error_events
  where occurred_at >= now() - interval '1 hour';

  return result;
end;
$$;

revoke all on function public.loopedin_report_client_error(text, text, text) from public, anon;
grant execute on function public.loopedin_report_client_error(text, text, text) to authenticated;
revoke all on function public.loopedin_maintain_client_error_telemetry() from public, anon, authenticated;
grant execute on function public.loopedin_maintain_client_error_telemetry() to service_role;
