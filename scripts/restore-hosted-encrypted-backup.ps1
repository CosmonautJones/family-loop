[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$ArtifactPath
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("loopedin-hosted-restore-" + [guid]::NewGuid().ToString('N'))
$archive = Join-Path $tempRoot 'backup.zip'
$expanded = Join-Path $tempRoot 'expanded'
$restoreContainer = "loopedin-hosted-restore-" + [guid]::NewGuid().ToString('N').Substring(0, 10)
$restorePassword = [guid]::NewGuid().ToString('N')
$restoreStarted = $null
$expectedImage = 'public.ecr.aws/supabase/postgres@sha256:178f0976b54a39237096bfa310c1a352dbc82fb1b08dda45cdb8acb5d40c1426'

function Invoke-Docker {
  param([string[]]$Arguments)
  & docker @Arguments
  if ($LASTEXITCODE -ne 0) { throw 'Isolated restore command failed.' }
}

function Invoke-RestoreSql {
  param([string]$Sql)
  $result = & docker exec $restoreContainer psql -v ON_ERROR_STOP=1 -U postgres -d restored -At -c $Sql
  if ($LASTEXITCODE -ne 0) { throw 'Isolated restore SQL check failed.' }
  return ($result -join "`n").Trim()
}

function Invoke-RlsCount {
  param([string]$UserId, [string]$Table)
  if ($UserId -notmatch '^[0-9a-f-]{36}$' -or $Table -notin @('loopedin_events', 'loopedin_event_messages', 'loopedin_event_media')) { throw 'Invalid RLS check input.' }
  $lines = & docker exec $restoreContainer psql -v ON_ERROR_STOP=1 -U postgres -d restored -At -c "set role authenticated; select set_config('request.jwt.claim.sub', '$UserId', false); select count(*) from public.$Table;"
  if ($LASTEXITCODE -ne 0) { throw 'Restored RLS check failed.' }
  return [int64]$lines[-1]
}

try {
  if (-not $env:LOOPEDIN_BACKUP_PASSPHRASE -or $env:LOOPEDIN_BACKUP_PASSPHRASE.Length -lt 24) { throw 'A backup passphrase of at least 24 characters is required.' }
  if (-not (Test-Path $ArtifactPath)) { throw 'Encrypted backup artifact is missing.' }
  New-Item -ItemType Directory -Force -Path $tempRoot, $expanded | Out-Null
  & node (Join-Path $repoRoot 'scripts/local-backup-crypto.mjs') decrypt $ArtifactPath $archive
  if ($LASTEXITCODE -ne 0) { throw 'Backup authentication/decryption failed.' }
  Expand-Archive -Path $archive -DestinationPath $expanded
  $manifest = Get-Content -Raw (Join-Path $expanded 'manifest.json') | ConvertFrom-Json
  if ($manifest.source -ne 'dedicated-supabase:vkogznsfthirhxkqysza' -or $manifest.format -ne 1) { throw 'Backup source marker mismatch.' }
  if ($manifest.postgresImage -ne $expectedImage) { throw 'Backup image identity mismatch.' }
  if ($manifest.sourceCommit -notmatch '^[0-9a-f]{40}$') { throw 'Backup source commit is invalid.' }
  if ((Get-FileHash -Algorithm SHA256 (Join-Path $expanded 'database.dump')).Hash.ToLowerInvariant() -ne $manifest.databaseSha256) { throw 'Database dump hash mismatch.' }
  foreach ($object in @($manifest.objects)) {
    $file = Join-Path $expanded $object.file
    if (-not (Test-Path $file) -or (Get-Item $file).Length -ne $object.bytes -or
      (Get-FileHash -Algorithm SHA256 $file).Hash.ToLowerInvariant() -ne $object.sha256) { throw 'Private object hash mismatch.' }
  }
  foreach ($migration in @($manifest.migrations)) {
    $file = Join-Path $expanded "migrations/$($migration.name)"
    if (-not (Test-Path $file) -or (Get-FileHash -Algorithm SHA256 $file).Hash.ToLowerInvariant() -ne $migration.sha256) { throw 'Migration inventory mismatch.' }
  }

  $restoreList = & docker run --rm --network none -v "${expanded}:/backup:ro" $expectedImage pg_restore -l /backup/database.dump
  if ($LASTEXITCODE -ne 0) { throw 'Could not inspect hosted database archive.' }
  $restoreList | Where-Object { $_ -notmatch '; [0-9]+ [0-9]+ SCHEMA - public ' -and $_ -notmatch ' DEFAULT ACL ' } |
    Set-Content -Encoding utf8 (Join-Path $expanded 'database.list')

  $restoreStarted = [DateTimeOffset]::UtcNow
  Invoke-Docker @('run', '-d', '--network', 'none', '--name', $restoreContainer, '-e', "POSTGRES_PASSWORD=$restorePassword", '-e', 'POSTGRES_DB=postgres', $expectedImage)
  $health = ''
  for ($attempt = 0; $attempt -lt 120; $attempt++) {
    $health = (& docker inspect $restoreContainer --format '{{.State.Health.Status}}' 2>$null).Trim()
    if ($health -eq 'healthy') { break }
    Start-Sleep -Milliseconds 500
  }
  if ($health -ne 'healthy') { throw 'Disposable restore database did not become healthy.' }
  Invoke-Docker @('cp', (Join-Path $expanded 'database.dump'), "${restoreContainer}:/tmp/database.dump")
  Invoke-Docker @('cp', (Join-Path $expanded 'database.list'), "${restoreContainer}:/tmp/database.list")
  Invoke-Docker @('exec', $restoreContainer, 'createdb', '-U', 'postgres', '-T', 'template0', 'restored')
  Invoke-Docker @('exec', $restoreContainer, 'pg_restore', '-U', 'postgres', '-d', 'restored', '--no-owner', '--exit-on-error', '-L', '/tmp/database.list', '/tmp/database.dump')

  $counts = Invoke-RestoreSql @'
select json_build_object(
  'profiles', (select count(*) from public.loopedin_profiles), 'groups', (select count(*) from public.loopedin_groups),
  'memberships', (select count(*) from public.loopedin_group_members), 'events', (select count(*) from public.loopedin_events),
  'rsvps', (select count(*) from public.loopedin_rsvps), 'messages', (select count(*) from public.loopedin_event_messages),
  'media', (select count(*) from public.loopedin_event_media), 'notifications', (select count(*) from public.loopedin_notifications),
  'authUsers', (select count(*) from auth.users), 'storageObjects', (select count(*) from storage.objects where bucket_id='loopedin-event-media')
)::text;
'@ | ConvertFrom-Json
  foreach ($property in $manifest.counts.PSObject.Properties) {
    if ([int64]$counts.($property.Name) -ne [int64]$property.Value) { throw "Restored count mismatch for $($property.Name)." }
  }
  $integrity = Invoke-RestoreSql @'
select json_build_object(
  'mediaWithoutEvent', (select count(*) from public.loopedin_event_media m left join public.loopedin_events e on e.id=m.event_id where e.id is null),
  'mediaWithoutObject', (select count(*) from public.loopedin_event_media m left join storage.objects o on o.bucket_id='loopedin-event-media' and o.name=m.storage_path where m.status='active' and o.id is null),
  'objectWithoutMedia', (select count(*) from storage.objects o left join public.loopedin_event_media m on m.storage_path=o.name where o.bucket_id='loopedin-event-media' and m.id is null)
)::text;
'@ | ConvertFrom-Json
  if ($integrity.mediaWithoutEvent -or $integrity.mediaWithoutObject -or $integrity.objectWithoutMedia) { throw 'Restored reference reconciliation failed.' }
  $telemetry = Invoke-RestoreSql @'
select json_build_object(
  'configurationRows', (select count(*) from loopedin_telemetry.configuration),
  'environment', (select environment from loopedin_telemetry.configuration where singleton),
  'eventRows', (select count(*) from loopedin_telemetry.client_error_events),
  'rateLimitRows', (select count(*) from loopedin_telemetry.client_error_rate_limits),
  'anonCanReport', has_function_privilege('anon', 'public.loopedin_report_client_error(text,text,text)', 'execute'),
  'authenticatedCanReport', has_function_privilege('authenticated', 'public.loopedin_report_client_error(text,text,text)', 'execute'),
  'authenticatedCanMaintain', has_function_privilege('authenticated', 'public.loopedin_maintain_client_error_telemetry()', 'execute'),
  'serviceRoleCanMaintain', has_function_privilege('service_role', 'public.loopedin_maintain_client_error_telemetry()', 'execute'),
  'anonSchemaUsage', has_schema_privilege('anon', 'loopedin_telemetry', 'usage'),
  'authenticatedSchemaUsage', has_schema_privilege('authenticated', 'loopedin_telemetry', 'usage')
)::text;
'@ | ConvertFrom-Json
  if ($telemetry.configurationRows -ne 1 -or $telemetry.environment -ne 'loopedin-staging' -or
    $telemetry.eventRows -ne 0 -or $telemetry.rateLimitRows -ne 0 -or $telemetry.anonCanReport -or
    -not $telemetry.authenticatedCanReport -or $telemetry.authenticatedCanMaintain -or
    -not $telemetry.serviceRoleCanMaintain -or $telemetry.anonSchemaUsage -or $telemetry.authenticatedSchemaUsage) {
    throw 'Restored telemetry privacy or retention contract mismatch.'
  }
  $restoredInventory = @(Invoke-RestoreSql "select coalesce(json_agg(json_build_object('bucketId',bucket_id,'name',name,'ownerId',owner_id) order by name), '[]'::json)::text from storage.objects where bucket_id='loopedin-event-media';" | ConvertFrom-Json)
  if (($restoredInventory | ConvertTo-Json -Compress -Depth 5) -ne (@($manifest.objects | ForEach-Object { [ordered]@{ bucketId=$_.bucketId; name=$_.name; ownerId=$_.ownerId } }) | ConvertTo-Json -Compress -Depth 5)) { throw 'Restored Storage inventory mismatch.' }
  $restoredMigrations = @(Invoke-RestoreSql "select coalesce(json_agg(json_build_object('version',version,'name',name) order by version), '[]'::json)::text from supabase_migrations.schema_migrations;" | ConvertFrom-Json)
  if (($restoredMigrations | ConvertTo-Json -Compress -Depth 5) -ne (@($manifest.hostedMigrationHistory) | ConvertTo-Json -Compress -Depth 5)) { throw 'Restored migration history mismatch.' }
  $scopes = @(Invoke-RestoreSql @'
with users as (select distinct user_id from public.loopedin_group_members)
select coalesce(json_agg(json_build_object(
  'userId', users.user_id,
  'events', (select count(*) from public.loopedin_events e where exists (select 1 from public.loopedin_group_members gm where gm.group_id=e.group_id and gm.user_id=users.user_id)),
  'messages', (select count(*) from public.loopedin_event_messages m join public.loopedin_events e on e.id=m.event_id where exists (select 1 from public.loopedin_group_members gm where gm.group_id=e.group_id and gm.user_id=users.user_id)),
  'media', (select count(*) from public.loopedin_event_media m join public.loopedin_events e on e.id=m.event_id where exists (select 1 from public.loopedin_group_members gm where gm.group_id=e.group_id and gm.user_id=users.user_id))
) order by users.user_id), '[]'::json)::text from users;
'@ | ConvertFrom-Json)
  if ($scopes.Count -lt 1) { throw 'Restored membership scopes are empty.' }
  $authorizedScopes = @()
  foreach ($scope in $scopes) {
    $actual = [ordered]@{
      events = Invoke-RlsCount $scope.userId 'loopedin_events'
      messages = Invoke-RlsCount $scope.userId 'loopedin_event_messages'
      media = Invoke-RlsCount $scope.userId 'loopedin_event_media'
    }
    if ($actual.events -ne $scope.events -or $actual.messages -ne $scope.messages -or $actual.media -ne $scope.media) { throw 'Restored member RLS scope mismatch.' }
    $authorizedScopes += [ordered]@{ events=$actual.events; messages=$actual.messages; media=$actual.media }
  }
  $outsiderId = [guid]::NewGuid().ToString()
  $rls = [ordered]@{
    authorizedScopes = $authorizedScopes
    outsiderEvents = Invoke-RlsCount $outsiderId 'loopedin_events'
    outsiderMessages = Invoke-RlsCount $outsiderId 'loopedin_event_messages'
    outsiderMedia = Invoke-RlsCount $outsiderId 'loopedin_event_media'
  }
  if ($counts.events -lt 1 -or $counts.messages -lt 1 -or $counts.media -lt 1 -or
    $rls.outsiderEvents -ne 0 -or $rls.outsiderMessages -ne 0 -or $rls.outsiderMedia -ne 0) { throw 'Restored RLS core-loop check failed.' }
  [ordered]@{
    outcome = 'PASS'
    isolation = 'disposable Docker database; primary was never a restore target'
    snapshotAt = $manifest.snapshotAt
    observedRestoreSeconds = [math]::Round(([DateTimeOffset]::UtcNow - $restoreStarted).TotalSeconds, 3)
    observedSnapshotAgeSeconds = [math]::Round(([DateTimeOffset]::UtcNow - [DateTimeOffset]::Parse($manifest.snapshotAt)).TotalSeconds, 3)
    counts = $counts
    integrity = $integrity
    telemetry = $telemetry
    rls = $rls
    objectCount = @($manifest.objects).Count
  } | ConvertTo-Json -Depth 6
}
finally {
  & docker rm -f $restoreContainer *> $null
  if (Test-Path $tempRoot) { Remove-Item -Recurse -Force -LiteralPath $tempRoot }
}
