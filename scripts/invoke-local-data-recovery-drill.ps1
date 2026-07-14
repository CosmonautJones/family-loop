[CmdletBinding()]
param(
  [string]$ArtifactPath = (Join-Path $PWD '.codex/evidence/opord17/local-family-backup.flbackup'),
  [string]$SourceContainer = 'supabase_db_family-loop',
  [switch]$KeepArtifact
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("loopedin-op17-" + [guid]::NewGuid().ToString('N'))
$stage = Join-Path $tempRoot 'stage'
$expanded = Join-Path $tempRoot 'expanded'
$plainArchive = Join-Path $tempRoot 'backup.zip'
$decryptedArchive = Join-Path $tempRoot 'restored.zip'
$restoreContainer = "loopedin-op17-restore-" + [guid]::NewGuid().ToString('N').Substring(0, 10)
$sourceDumpInContainer = '/tmp/loopedin-op17-database.dump'
$restorePassword = [guid]::NewGuid().ToString('N')
$restoreStarted = $null
$artifactCreated = $false

function Invoke-Docker {
  param([string[]]$Arguments)
  & docker @Arguments
  if ($LASTEXITCODE -ne 0) { throw 'Docker command failed; inspect the immediately preceding redacted-safe output.' }
}

function Invoke-RestoreSql {
  param([string]$Sql)
  $result = & docker exec $restoreContainer psql -v ON_ERROR_STOP=1 -U postgres -d restored -At -c $Sql
  if ($LASTEXITCODE -ne 0) { throw 'Isolated restore SQL check failed.' }
  return ($result -join "`n").Trim()
}

function Invoke-RlsCount {
  param([string]$UserId, [ValidateSet('events', 'messages', 'media')][string]$Resource)
  if ($UserId -notmatch '^[0-9a-f-]{36}$') { throw 'RLS test identity is missing or malformed.' }
  $table = switch ($Resource) {
    'events' { 'public.loopedin_events' }
    'messages' { 'public.loopedin_event_messages' }
    'media' { 'public.loopedin_event_media' }
  }
  $lines = & docker exec $restoreContainer psql -v ON_ERROR_STOP=1 -U postgres -d restored -At -c "set role authenticated; select set_config('request.jwt.claim.sub', '$UserId', false); select count(*) from $table;"
  if ($LASTEXITCODE -ne 0) { throw "RLS $Resource check failed." }
  return [int64]$lines[-1]
}

try {
  if (-not $env:LOOPEDIN_BACKUP_PASSPHRASE -or $env:LOOPEDIN_BACKUP_PASSPHRASE.Length -lt 16) {
    throw 'Set LOOPEDIN_BACKUP_PASSPHRASE to a runtime-only value of at least 16 characters.'
  }
  if ((docker inspect $SourceContainer --format '{{.State.Running}}' 2>$null) -ne 'true') {
    throw "The local source container $SourceContainer is not running."
  }
  if ($SourceContainer -notlike 'supabase_db_*') { throw 'Only a local Supabase database container is allowed.' }
  if (Test-Path $ArtifactPath) { throw 'ArtifactPath already exists; refusing to overwrite a backup.' }

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ArtifactPath), $stage, (Join-Path $stage 'objects') | Out-Null
  $image = (docker inspect $SourceContainer --format '{{.Config.Image}}').Trim()
  $snapshotAt = [DateTimeOffset]::UtcNow

  Invoke-Docker -Arguments @('exec', $SourceContainer, 'pg_dump', '-U', 'postgres', '-d', 'postgres', '-Fc',
    '--schema=public', '--schema=loopedin_private', '--schema=auth', '--schema=storage', '-f', $sourceDumpInContainer)
  Invoke-Docker -Arguments @('cp', "${SourceContainer}:$sourceDumpInContainer", (Join-Path $stage 'database.dump'))
  Invoke-Docker -Arguments @('exec', $SourceContainer, 'rm', $sourceDumpInContainer)

  $restoreList = & docker run --rm -v "${stage}:/backup:ro" $image pg_restore -l /backup/database.dump
  if ($LASTEXITCODE -ne 0) { throw 'Could not inspect the database archive.' }
  $restoreList | Where-Object {
    $_ -notmatch '; [0-9]+ [0-9]+ SCHEMA - public ' -and $_ -notmatch ' DEFAULT ACL '
  } |
    Set-Content -Encoding utf8 (Join-Path $stage 'database.list')

  $statusLines = & npx supabase status -o env 2>$null
  $status = @{}
  foreach ($line in $statusLines) {
    if ($line -match '^([A-Z0-9_]+)="(.*)"$') { $status[$matches[1]] = $matches[2] }
  }
  if ($status.API_URL -notmatch '^http://127\.0\.0\.1:' -or -not $status.SERVICE_ROLE_KEY) {
    throw 'A loopback Supabase API and local service role are required.'
  }

  $inventoryJson = (& docker exec $SourceContainer psql -U postgres -d postgres -At -c @'
select coalesce(json_agg(json_build_object(
  'id', id,
  'bucketId', bucket_id,
  'name', name,
  'ownerId', owner_id,
  'createdAt', created_at
) order by bucket_id, name), '[]'::json)::text
from storage.objects
where bucket_id = 'loopedin-event-media';
'@) -join ''
  if ($LASTEXITCODE -ne 0) { throw 'Could not inventory private Storage objects.' }
  $parsedInventory = $inventoryJson | ConvertFrom-Json
  $inventory = if ($null -eq $parsedInventory) { @() } else { @($parsedInventory) }
  $objectManifest = @()
  for ($index = 0; $index -lt $inventory.Count; $index++) {
    $object = $inventory[$index]
    $fileName = ('{0:d4}.bin' -f $index)
    $destination = Join-Path $stage "objects/$fileName"
    $encodedName = (($object.name -split '/') | ForEach-Object { [uri]::EscapeDataString($_) }) -join '/'
    $uri = "$($status.API_URL)/storage/v1/object/$([uri]::EscapeDataString($object.bucketId))/$encodedName"
    Invoke-WebRequest -Uri $uri -Headers @{ Authorization = "Bearer $($status.SERVICE_ROLE_KEY)"; apikey = $status.SERVICE_ROLE_KEY } -OutFile $destination | Out-Null
    $objectManifest += [ordered]@{
      bucketId = $object.bucketId
      name = $object.name
      ownerId = $object.ownerId
      file = "objects/$fileName"
      bytes = (Get-Item $destination).Length
      sha256 = (Get-FileHash -Algorithm SHA256 $destination).Hash.ToLowerInvariant()
    }
  }

  $countsJson = (& docker exec $SourceContainer psql -U postgres -d postgres -At -c @'
select json_build_object(
  'profiles', (select count(*) from public.loopedin_profiles),
  'groups', (select count(*) from public.loopedin_groups),
  'memberships', (select count(*) from public.loopedin_group_members),
  'events', (select count(*) from public.loopedin_events),
  'rsvps', (select count(*) from public.loopedin_rsvps),
  'messages', (select count(*) from public.loopedin_event_messages),
  'media', (select count(*) from public.loopedin_event_media),
  'notifications', (select count(*) from public.loopedin_notifications),
  'authUsers', (select count(*) from auth.users),
  'storageObjects', (select count(*) from storage.objects where bucket_id='loopedin-event-media')
)::text;
'@) -join ''
  if ($LASTEXITCODE -ne 0) { throw 'Could not capture source row counts.' }

  $migrationFiles = Get-ChildItem (Join-Path $repoRoot 'supabase/migrations') -File | Sort-Object Name
  $migrations = @($migrationFiles | ForEach-Object {
    [ordered]@{ name = $_.Name; bytes = $_.Length; sha256 = (Get-FileHash -Algorithm SHA256 $_.FullName).Hash.ToLowerInvariant() }
  })
  $manifest = [ordered]@{
    format = 1
    snapshotAt = $snapshotAt.ToString('o')
    source = 'loopback-supabase'
    postgresImage = $image
    counts = ($countsJson | ConvertFrom-Json)
    migrations = $migrations
    objects = $objectManifest
  }
  $manifest | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 (Join-Path $stage 'manifest.json')
  Copy-Item -Recurse (Join-Path $repoRoot 'supabase/migrations') (Join-Path $stage 'migrations')

  Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $plainArchive -CompressionLevel Optimal
  & node (Join-Path $repoRoot 'scripts/local-backup-crypto.mjs') encrypt $plainArchive $ArtifactPath
  if ($LASTEXITCODE -ne 0) { throw 'Backup encryption failed.' }
  $artifactCreated = $true

  & node (Join-Path $repoRoot 'scripts/local-backup-crypto.mjs') decrypt $ArtifactPath $decryptedArchive
  if ($LASTEXITCODE -ne 0) { throw 'Backup authentication/decryption failed.' }
  Expand-Archive -Path $decryptedArchive -DestinationPath $expanded
  $restoredManifest = Get-Content -Raw (Join-Path $expanded 'manifest.json') | ConvertFrom-Json
  foreach ($object in $restoredManifest.objects) {
    $restoredObject = Join-Path $expanded $object.file
    $actualHash = (Get-FileHash -Algorithm SHA256 $restoredObject).Hash.ToLowerInvariant()
    if ($actualHash -ne $object.sha256 -or (Get-Item $restoredObject).Length -ne $object.bytes) {
      throw "Object integrity mismatch for $($object.bucketId)/$($object.name)."
    }
  }

  $restoreStarted = [DateTimeOffset]::UtcNow
  Invoke-Docker -Arguments @('run', '-d', '--name', $restoreContainer, '-e', "POSTGRES_PASSWORD=$restorePassword", '-e', 'POSTGRES_DB=postgres', $image)
  $health = ''
  for ($attempt = 0; $attempt -lt 120; $attempt++) {
    $health = (& docker inspect $restoreContainer --format '{{.State.Health.Status}}' 2>$null).Trim()
    if ($health -eq 'healthy') { break }
    Start-Sleep -Milliseconds 500
  }
  if ($health -ne 'healthy') { throw 'Disposable restore database did not become healthy.' }

  Invoke-Docker -Arguments @('cp', (Join-Path $expanded 'database.dump'), "${restoreContainer}:/tmp/database.dump")
  Invoke-Docker -Arguments @('cp', (Join-Path $expanded 'database.list'), "${restoreContainer}:/tmp/database.list")
  foreach ($migration in @($restoredManifest.migrations)) {
    $migrationPath = Join-Path $expanded "migrations/$($migration.name)"
    if (-not (Test-Path $migrationPath) -or
      (Get-FileHash -Algorithm SHA256 $migrationPath).Hash.ToLowerInvariant() -ne $migration.sha256) {
      throw "Migration inventory mismatch for $($migration.name)."
    }
  }
  Invoke-Docker -Arguments @('exec', $restoreContainer, 'createdb', '-U', 'postgres', '-T', 'template0', 'restored')
  Invoke-Docker -Arguments @('exec', $restoreContainer, 'pg_restore', '-U', 'postgres', '-d', 'restored', '--no-owner', '--exit-on-error', '-L', '/tmp/database.list', '/tmp/database.dump')

  $restoredCounts = Invoke-RestoreSql @'
select json_build_object(
  'profiles', (select count(*) from public.loopedin_profiles),
  'groups', (select count(*) from public.loopedin_groups),
  'memberships', (select count(*) from public.loopedin_group_members),
  'events', (select count(*) from public.loopedin_events),
  'rsvps', (select count(*) from public.loopedin_rsvps),
  'messages', (select count(*) from public.loopedin_event_messages),
  'media', (select count(*) from public.loopedin_event_media),
  'notifications', (select count(*) from public.loopedin_notifications),
  'authUsers', (select count(*) from auth.users),
  'storageObjects', (select count(*) from storage.objects where bucket_id='loopedin-event-media')
)::text;
'@ | ConvertFrom-Json
  foreach ($property in $restoredManifest.counts.PSObject.Properties) {
    if ([int64]$restoredCounts.($property.Name) -ne [int64]$property.Value) {
      throw "Count mismatch for $($property.Name)."
    }
  }

  $integrity = Invoke-RestoreSql @'
select json_build_object(
  'mediaWithoutEvent', (select count(*) from public.loopedin_event_media m left join public.loopedin_events e on e.id=m.event_id where e.id is null),
  'mediaWithoutObject', (select count(*) from public.loopedin_event_media m left join storage.objects o on o.bucket_id='loopedin-event-media' and o.name=m.storage_path where m.status='active' and o.id is null),
  'objectWithoutMedia', (select count(*) from storage.objects o left join public.loopedin_event_media m on m.storage_path=o.name where o.bucket_id='loopedin-event-media' and m.id is null)
)::text;
'@ | ConvertFrom-Json
  if ($integrity.mediaWithoutEvent -or $integrity.mediaWithoutObject -or $integrity.objectWithoutMedia) {
    throw 'Restored database/object foreign-reference reconciliation failed.'
  }

  $identities = Invoke-RestoreSql @'
select json_build_object(
  'memberId', (select gm.user_id from public.loopedin_group_members gm where gm.role<>'owner' limit 1),
  'outsiderId', (select u.id from auth.users u where not exists (select 1 from public.loopedin_group_members gm where gm.user_id=u.id) limit 1)
)::text;
'@ | ConvertFrom-Json
  $rls = [ordered]@{
    memberEvents = Invoke-RlsCount $identities.memberId events
    memberMessages = Invoke-RlsCount $identities.memberId messages
    memberMedia = Invoke-RlsCount $identities.memberId media
    outsiderEvents = Invoke-RlsCount $identities.outsiderId events
    outsiderMessages = Invoke-RlsCount $identities.outsiderId messages
    outsiderMedia = Invoke-RlsCount $identities.outsiderId media
  }
  if ($rls.memberEvents -lt 1 -or $rls.memberMessages -lt 1 -or $rls.memberMedia -lt 1 -or
    $rls.outsiderEvents -ne 0 -or $rls.outsiderMessages -ne 0 -or $rls.outsiderMedia -ne 0) {
    throw 'Restored authenticated/outsider RLS smoke failed.'
  }

  $rtoSeconds = [math]::Round(([DateTimeOffset]::UtcNow - $restoreStarted).TotalSeconds, 3)
  $snapshotAgeSeconds = [math]::Round(([DateTimeOffset]::UtcNow - [DateTimeOffset]::Parse($restoredManifest.snapshotAt)).TotalSeconds, 3)
  $report = [ordered]@{
    outcome = 'PASS'
    isolation = 'disposable Docker container and temporary object directory; no primary mounts or network'
    encryptedArtifact = (Resolve-Path $ArtifactPath).Path
    snapshotAt = $restoredManifest.snapshotAt
    observedSnapshotAgeSeconds = $snapshotAgeSeconds
    observedRestoreSeconds = $rtoSeconds
    counts = $restoredCounts
    integrity = $integrity
    rls = $rls
    objectCount = if ($null -eq $restoredManifest.objects) { 0 } else { @($restoredManifest.objects).Count }
    cleanup = 'disposable restore is removed in finally'
  }
  $report | ConvertTo-Json -Depth 6
}
finally {
  & docker exec $SourceContainer rm -f $sourceDumpInContainer *> $null
  & docker rm -f $restoreContainer *> $null
  if (Test-Path $tempRoot) { Remove-Item -Recurse -Force -LiteralPath $tempRoot }
  if ($artifactCreated -and -not $KeepArtifact -and (Test-Path $ArtifactPath)) { Remove-Item -Force -LiteralPath $ArtifactPath }
}
