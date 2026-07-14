[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][ValidatePattern('^[0-9a-f-]{36}$')][string]$ActorUserId,
  [Parameter(Mandatory = $true)][ValidatePattern('^[0-9a-f-]{36}$')][string]$SubjectUserId,
  [ValidateRange(1, 500)][int]$MaxActions = 100,
  [string]$OutputPath = (Join-Path $PWD '.codex/evidence/opord17/lifecycle-dry-run.json'),
  [string]$SourceContainer = 'supabase_db_family-loop'
)

$ErrorActionPreference = 'Stop'
if ($SourceContainer -notlike 'supabase_db_*' -or (docker inspect $SourceContainer --format '{{.State.Running}}' 2>$null) -ne 'true') {
  throw 'A running local Supabase database container is required.'
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$tempInput = Join-Path ([System.IO.Path]::GetTempPath()) ("loopedin-lifecycle-" + [guid]::NewGuid().ToString('N') + '.json')
try {
  $dataset = (& docker exec $SourceContainer psql -U postgres -d postgres -At -c @'
select json_build_object(
  'profiles', (select coalesce(json_agg(json_build_object('id', id) order by id), '[]') from public.loopedin_profiles),
  'memberships', (select coalesce(json_agg(json_build_object('groupId', group_id, 'userId', user_id, 'role', role) order by group_id, user_id), '[]') from public.loopedin_group_members),
  'groups', (select coalesce(json_agg(json_build_object('id', id, 'createdBy', created_by) order by id), '[]') from public.loopedin_groups),
  'events', (select coalesce(json_agg(json_build_object('id', id, 'groupId', group_id, 'createdBy', created_by) order by id), '[]') from public.loopedin_events),
  'rsvps', (select coalesce(json_agg(json_build_object('eventId', event_id, 'userId', user_id) order by event_id, user_id), '[]') from public.loopedin_rsvps),
  'messages', (select coalesce(json_agg(json_build_object('id', id, 'eventId', event_id, 'authorId', author_id) order by id), '[]') from public.loopedin_event_messages),
  'media', (select coalesce(json_agg(json_build_object('id', id, 'eventId', event_id, 'uploadedBy', uploaded_by, 'storagePath', storage_path, 'status', status, 'deleteRequestedAt', delete_requested_at) order by id), '[]') from public.loopedin_event_media),
  'notifications', (select coalesce(json_agg(json_build_object('id', id, 'recipientId', user_id) order by id), '[]') from public.loopedin_notifications),
  'objects', (select coalesce(json_agg(json_build_object('id', id, 'bucketId', bucket_id, 'name', name, 'ownerId', owner_id, 'createdAt', created_at) order by id), '[]') from storage.objects where bucket_id='loopedin-event-media')
)::text;
'@) -join ''
  if ($LASTEXITCODE -ne 0) { throw 'Could not inventory the local lifecycle boundary.' }
  $dataset | Set-Content -Encoding utf8 $tempInput
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPath) | Out-Null
  & node (Join-Path $repoRoot 'scripts/data-lifecycle-plan.mjs') $tempInput $OutputPath $ActorUserId $SubjectUserId $MaxActions
  if ($LASTEXITCODE -ne 0) { throw 'Lifecycle dry-run planning failed.' }
}
finally {
  if (Test-Path $tempInput) { Remove-Item -Force -LiteralPath $tempInput }
}
