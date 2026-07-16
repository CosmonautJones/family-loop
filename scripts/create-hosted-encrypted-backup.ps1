[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$ArtifactPath,
  [switch]$AcknowledgeDedicatedStaging
)

$ErrorActionPreference = 'Stop'
$projectRef = 'vkogznsfthirhxkqysza'
$quarantinedRef = 'lzscofbvecgpchokxhyb'
$apiUrl = "https://$projectRef.supabase.co"
$bucket = 'loopedin-event-media'
$postgresImage = 'public.ecr.aws/supabase/postgres@sha256:178f0976b54a39237096bfa310c1a352dbc82fb1b08dda45cdb8acb5d40c1426'
$poolerHost = 'aws-1-us-east-2.pooler.supabase.com'
$poolerUser = "postgres.$projectRef"
$repoRoot = Split-Path -Parent $PSScriptRoot
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("loopedin-hosted-backup-" + [guid]::NewGuid().ToString('N'))
$stage = Join-Path $tempRoot 'stage'
$plainArchive = Join-Path $tempRoot 'backup.zip'

function Invoke-PostgresContainer {
  param([string[]]$Arguments)
  & docker run --rm -e PGPASSWORD -v "${tempRoot}:/work" $postgresImage @Arguments
  if ($LASTEXITCODE -ne 0) { throw 'Hosted database backup command failed.' }
}

function Get-HostedFingerprint {
  $sql = @'
select md5(json_build_object(
  'profiles', (select coalesce(json_agg(t order by id), '[]'::json) from public.loopedin_profiles t),
  'groups', (select coalesce(json_agg(t order by id), '[]'::json) from public.loopedin_groups t),
  'members', (select coalesce(json_agg(t order by group_id,user_id), '[]'::json) from public.loopedin_group_members t),
  'events', (select coalesce(json_agg(t order by id), '[]'::json) from public.loopedin_events t),
  'rsvps', (select coalesce(json_agg(t order by event_id,user_id), '[]'::json) from public.loopedin_rsvps t),
  'messages', (select coalesce(json_agg(t order by id), '[]'::json) from public.loopedin_event_messages t),
  'media', (select coalesce(json_agg(t order by id), '[]'::json) from public.loopedin_event_media t),
  'notifications', (select coalesce(json_agg(t order by id), '[]'::json) from public.loopedin_notifications t),
  'reminders', (select coalesce(json_agg(t order by event_id,user_id), '[]'::json) from public.loopedin_reminder_drafts t),
  'invitations', (select coalesce(json_agg(t order by id), '[]'::json) from public.loopedin_group_invitations t),
  'entitlements', (select coalesce(json_agg(t order by user_id), '[]'::json) from loopedin_private.loopedin_group_creation_entitlements t),
  'eventOps', (select coalesce(json_agg(t order by actor_id,group_id,operation_key), '[]'::json) from loopedin_private.loopedin_event_create_operations t),
  'messageOps', (select coalesce(json_agg(t order by actor_id,event_id,operation_key), '[]'::json) from loopedin_private.loopedin_message_create_operations t),
  'authUsers', (select coalesce(json_agg(t order by id), '[]'::json) from auth.users t),
  'authIdentities', (select coalesce(json_agg(t order by id), '[]'::json) from auth.identities t),
  'storageBuckets', (select coalesce(json_agg(t order by id), '[]'::json) from storage.buckets t),
  'storage', (select coalesce(json_agg(t order by bucket_id,name), '[]'::json) from storage.objects t where bucket_id='loopedin-event-media')
)::text);
'@
  $value = (& docker run --rm -e PGPASSWORD $postgresImage psql $connection -At -c $sql) -join ''
  if ($LASTEXITCODE -ne 0 -or $value -notmatch '^[0-9a-f]{32}$') { throw 'Could not fingerprint hosted backup state.' }
  return $value
}

try {
  if (-not $AcknowledgeDedicatedStaging) { throw 'Refusing hosted backup without -AcknowledgeDedicatedStaging.' }
  if ($projectRef -eq $quarantinedRef) { throw 'Refusing the quarantined Supabase project.' }
  if (-not $env:LOOPEDIN_STAGING_DB_PASSWORD) { throw 'LOOPEDIN_STAGING_DB_PASSWORD is required.' }
  if ($env:LOOPEDIN_STAGING_SUPABASE_SECRET_KEY -notlike 'sb_secret_*') { throw 'Dedicated staging secret key is required.' }
  if (-not $env:LOOPEDIN_BACKUP_PASSPHRASE -or $env:LOOPEDIN_BACKUP_PASSPHRASE.Length -lt 24) { throw 'A backup passphrase of at least 24 characters is required.' }
  if (Test-Path $ArtifactPath) { throw 'ArtifactPath already exists; refusing to overwrite a backup.' }

  New-Item -ItemType Directory -Force -Path $stage, (Join-Path $stage 'objects'), (Split-Path -Parent $ArtifactPath) | Out-Null
  $env:PGPASSWORD = $env:LOOPEDIN_STAGING_DB_PASSWORD
  $connection = "host=$poolerHost port=5432 user=$poolerUser dbname=postgres sslmode=require"
  $snapshotStartedAt = [DateTimeOffset]::UtcNow
  $fingerprintBefore = Get-HostedFingerprint
  Invoke-PostgresContainer @('pg_dump', $connection, '-Fc', '--no-owner', '--schema=public', '--schema=loopedin_private', '--schema=auth', '--schema=storage', '--schema=supabase_migrations', '-f', '/work/stage/database.dump')

  $countsJson = (& docker run --rm -e PGPASSWORD $postgresImage psql $connection -At -c @'
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
  if ($LASTEXITCODE -ne 0) { throw 'Could not capture hosted row counts.' }

  $inventoryJson = (& docker run --rm -e PGPASSWORD $postgresImage psql $connection -At -c @'
select coalesce(json_agg(json_build_object(
  'bucketId', bucket_id, 'name', name, 'ownerId', owner_id
) order by name), '[]'::json)::text
from storage.objects where bucket_id='loopedin-event-media';
'@) -join ''
  if ($LASTEXITCODE -ne 0) { throw 'Could not capture hosted Storage inventory.' }
  $inventory = @($inventoryJson | ConvertFrom-Json)
  $objectManifest = @()
  for ($index = 0; $index -lt $inventory.Count; $index++) {
    $object = $inventory[$index]
    $fileName = ('{0:d4}.bin' -f $index)
    $destination = Join-Path $stage "objects/$fileName"
    $encodedName = (($object.name -split '/') | ForEach-Object { [uri]::EscapeDataString($_) }) -join '/'
    Invoke-WebRequest -Uri "$apiUrl/storage/v1/object/authenticated/$([uri]::EscapeDataString($object.bucketId))/$encodedName" -Headers @{
      Authorization = "Bearer $($env:LOOPEDIN_STAGING_SUPABASE_SECRET_KEY)"
      apikey = $env:LOOPEDIN_STAGING_SUPABASE_SECRET_KEY
    } -OutFile $destination | Out-Null
    $objectManifest += [ordered]@{
      bucketId = $object.bucketId
      name = $object.name
      ownerId = $object.ownerId
      file = "objects/$fileName"
      bytes = (Get-Item $destination).Length
      sha256 = (Get-FileHash -Algorithm SHA256 $destination).Hash.ToLowerInvariant()
    }
  }
  $fingerprintAfter = Get-HostedFingerprint
  if ($fingerprintBefore -ne $fingerprintAfter) { throw 'Hosted state changed during backup; artifact was discarded.' }

  $migrationHistoryJson = (& docker run --rm -e PGPASSWORD $postgresImage psql $connection -At -c "select coalesce(json_agg(json_build_object('version',version,'name',name) order by version), '[]'::json)::text from supabase_migrations.schema_migrations;") -join ''
  if ($LASTEXITCODE -ne 0) { throw 'Could not capture hosted migration history.' }

  $migrationFiles = Get-ChildItem (Join-Path $repoRoot 'supabase/migrations') -File -Filter '*.sql' | Sort-Object Name
  $migrations = @($migrationFiles | ForEach-Object {
    [ordered]@{ name = $_.Name; bytes = $_.Length; sha256 = (Get-FileHash -Algorithm SHA256 $_.FullName).Hash.ToLowerInvariant() }
  })
  Copy-Item -Recurse (Join-Path $repoRoot 'supabase/migrations') (Join-Path $stage 'migrations')
  $manifest = [ordered]@{
    format = 1
    snapshotAt = $snapshotStartedAt.ToString('o')
    source = "dedicated-supabase:$projectRef"
    postgresImage = $postgresImage
    sourceCommit = (& git -C $repoRoot rev-parse HEAD).Trim()
    authoritativeStateFingerprint = $fingerprintBefore
    counts = ($countsJson | ConvertFrom-Json)
    databaseSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $stage 'database.dump')).Hash.ToLowerInvariant()
    migrations = $migrations
    hostedMigrationHistory = ($migrationHistoryJson | ConvertFrom-Json)
    objects = $objectManifest
  }
  $manifest | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 (Join-Path $stage 'manifest.json')
  Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $plainArchive -CompressionLevel Optimal
  & node (Join-Path $repoRoot 'scripts/local-backup-crypto.mjs') encrypt $plainArchive $ArtifactPath
  if ($LASTEXITCODE -ne 0) { throw 'Backup encryption failed.' }
  $artifact = Get-Item $ArtifactPath
  [ordered]@{
    outcome = 'PASS'
    snapshotAt = $manifest.snapshotAt
    encryptedBytes = $artifact.Length
    encryptedSha256 = (Get-FileHash -Algorithm SHA256 $artifact).Hash.ToLowerInvariant()
    counts = $manifest.counts
    objectCount = $objectManifest.Count
    migrationCount = $migrations.Count
  } | ConvertTo-Json -Depth 5
}
finally {
  $env:PGPASSWORD = $null
  $connection = $null
  if (Test-Path $tempRoot) { Remove-Item -Recurse -Force -LiteralPath $tempRoot }
}
