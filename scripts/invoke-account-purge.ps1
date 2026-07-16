[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][ValidatePattern('^[0-9a-fA-F-]{36}$')][string]$UserId,
  [Parameter(Mandatory = $true)][string]$JournalPath,
  [ValidatePattern('^[0-9a-fA-F-]{36}$')][string]$OperationId = ([guid]::NewGuid().ToString()),
  [ValidatePattern('^[A-Z0-9][A-Z0-9._:-]{2,79}$')][string]$LeaseOwner = 'LOCAL-PURGE-OPERATOR'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$journalFullPath = [IO.Path]::GetFullPath($JournalPath)
$repoFullPath = [IO.Path]::GetFullPath($repoRoot) + [IO.Path]::DirectorySeparatorChar
if ($journalFullPath.StartsWith($repoFullPath, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'The restore-safe purge journal must be stored outside the repository.'
}
if ([IO.Path]::GetExtension($journalFullPath) -ne '.lpjournal') {
  throw 'The purge journal path must end in .lpjournal.'
}
if ($env:LOOPEDIN_PURGE_CONFIRM -ne 'LOCAL_ONLY_ACCOUNT_PURGE') {
  throw 'Set LOOPEDIN_PURGE_CONFIRM to LOCAL_ONLY_ACCOUNT_PURGE for this local destructive fixture.'
}
if (-not $env:SUPABASE_URL -or -not $env:SUPABASE_SERVICE_ROLE_KEY -or -not $env:LOOPEDIN_PURGE_JOURNAL_PASSPHRASE) {
  throw 'SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and LOOPEDIN_PURGE_JOURNAL_PASSPHRASE are required.'
}
$apiUri = [Uri]$env:SUPABASE_URL
if ($apiUri.Scheme -ne 'http' -or $apiUri.Host -notin @('127.0.0.1', 'localhost', '::1')) {
  throw 'This operator is hard-locked to loopback Supabase. Hosted deletion requires a separately reviewed operator.'
}

$headers = @{
  apikey = $env:SUPABASE_SERVICE_ROLE_KEY
  Authorization = "Bearer $($env:SUPABASE_SERVICE_ROLE_KEY)"
  'Content-Type' = 'application/json'
}
$journalScript = Join-Path $PSScriptRoot 'account-purge-journal.mjs'
$stage = 'LEASE'
$planDigest = $null
$objectCount = 0
$counts = @{}
$retainUntil = [DateTimeOffset]::UtcNow.AddDays(32)
$phaseRank = @{
  leased = 0
  prepared = 1
  objects_deleted = 2
  relational_finalized = 3
  auth_deleted = 4
  completed = 5
  restore_reconciled = 6
}
$journalPhase = $null

function Invoke-PurgeRpc([string]$Name, [hashtable]$Body) {
  try {
    return Invoke-RestMethod -Method Post -Uri "$($env:SUPABASE_URL)/rest/v1/rpc/$Name" -Headers $headers -Body ($Body | ConvertTo-Json -Compress -Depth 10)
  }
  catch {
    throw "RPC_$($Name.ToUpperInvariant())_FAILED"
  }
}

function Add-JournalCheckpoint([string]$Phase, [string]$FailureCode = '') {
  $now = [DateTimeOffset]::UtcNow
  $record = [ordered]@{
    operationId = $OperationId.ToLowerInvariant()
    subjectId = $UserId.ToLowerInvariant()
    planDigest = $planDigest
    phase = $Phase
    objectCount = $objectCount
    counts = $counts
    occurredAt = $now.ToString('o')
    retainUntil = $retainUntil.ToString('o')
  }
  if ($Phase -eq 'failed') { $record.failureCode = $FailureCode }
  $json = $record | ConvertTo-Json -Compress -Depth 10
  $json | & node $journalScript append $journalFullPath - | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'JOURNAL_CHECKPOINT_FAILED' }
}

function Encode-ObjectPath([string]$Path) {
  return (($Path -split '/') | ForEach-Object { [Uri]::EscapeDataString($_) }) -join '/'
}

function Remove-PrivateObjects([object[]]$Paths) {
  for ($offset = 0; $offset -lt $Paths.Count; $offset += 100) {
    $last = [Math]::Min($offset + 99, $Paths.Count - 1)
    $batch = @($Paths[$offset..$last])
    try {
      Invoke-RestMethod -Method Delete -Uri "$($env:SUPABASE_URL)/storage/v1/object/loopedin-event-media" -Headers $headers -Body (@{ prefixes = $batch } | ConvertTo-Json -Compress) | Out-Null
    }
    catch {
      throw 'OBJECT_DELETE_FAILED'
    }
  }
}

function Assert-PrivateObjectsAbsent([object[]]$Paths) {
  foreach ($path in $Paths) {
    $encoded = Encode-ObjectPath ([string]$path)
    try {
      $response = Invoke-WebRequest -Method Get -Uri "$($env:SUPABASE_URL)/storage/v1/object/authenticated/loopedin-event-media/$encoded" -Headers $headers -SkipHttpErrorCheck
    }
    catch {
      throw 'OBJECT_VERIFY_FAILED'
    }
    if ([int]$response.StatusCode -eq 404) { continue }
    if ([int]$response.StatusCode -eq 400) {
      try { $errorBody = $response.Content | ConvertFrom-Json } catch { throw 'OBJECT_VERIFY_FAILED' }
      if ([string]$errorBody.statusCode -eq '404' -and [string]$errorBody.error -eq 'not_found') { continue }
    }
    if ([int]$response.StatusCode -in @(200, 206)) { throw 'OBJECT_STILL_PRESENT' }
    throw 'OBJECT_VERIFY_FAILED'
  }
}

function Refresh-Lease {
  Invoke-PurgeRpc 'loopedin_lease_account_purge' @{
    target_operation_id = $OperationId
    target_user_id = $UserId
    target_lease_owner = $LeaseOwner
  } | Out-Null
}

function Get-JournalState {
  $stateJson = & node $journalScript state $journalFullPath $OperationId
  if ($LASTEXITCODE -ne 0) { throw 'JOURNAL_STATE_FAILED' }
  return $stateJson | ConvertFrom-Json
}

function Stop-ForLocalFailureInjection([string]$Checkpoint) {
  if ($env:LOOPEDIN_PURGE_TEST_STOP_AFTER -eq $Checkpoint) {
    Write-Output "Local purge failure injection stopped after $Checkpoint."
    exit 86
  }
}

Write-Output "Account purge operation $OperationId started against disposable loopback data."
try {
  $journalState = Get-JournalState
  $journalPhase = if ($journalState.phase) { [string]$journalState.phase } else { $null }
  if ($journalState.planDigest) { $planDigest = [string]$journalState.planDigest }
  if ($journalState.objectCount) { $objectCount = [int]$journalState.objectCount }
  if ($journalState.counts) { $counts = $journalState.counts }
  if ($journalState.retainUntil -and [DateTimeOffset]::Parse([string]$journalState.retainUntil) -gt $retainUntil) {
    $retainUntil = [DateTimeOffset]::Parse([string]$journalState.retainUntil)
  }
  if ($journalPhase -eq 'completed' -or $journalPhase -eq 'restore_reconciled') {
    $authUri = "$($env:SUPABASE_URL)/auth/v1/admin/users/$($UserId.ToLowerInvariant())"
    $verifyResponse = Invoke-WebRequest -Method Get -Uri $authUri -Headers $headers -SkipHttpErrorCheck
    if ([int]$verifyResponse.StatusCode -ne 404) { throw 'JOURNAL_DB_DIVERGENCE' }
    $completed = Invoke-PurgeRpc 'loopedin_complete_account_purge' @{
      target_operation_id = $OperationId
      target_lease_owner = $LeaseOwner
      target_plan_digest = $planDigest
    }
    if ([string]$completed.status -notin @('completed', 'already_completed')) { throw 'JOURNAL_DB_DIVERGENCE' }
    Write-Output "Account purge operation $OperationId is already durably complete."
    return
  }

  $lease = Invoke-PurgeRpc 'loopedin_lease_account_purge' @{
    target_operation_id = $OperationId
    target_user_id = $UserId
    target_lease_owner = $LeaseOwner
  }
  if ($lease.backupExpiresAfter) {
    $requiredRetention = [DateTimeOffset]::Parse([string]$lease.backupExpiresAfter).AddDays(1)
    if ($requiredRetention -gt $retainUntil) { $retainUntil = $requiredRetention }
  }
  if ($null -eq $journalPhase) {
    Add-JournalCheckpoint 'leased'
    $journalPhase = 'leased'
  }
  $databaseRank = switch ([string]$lease.status) {
    'leased' { 0 }
    'prepared' { 1 }
    'relational_finalized' { 3 }
    'completed' { 5 }
    default { throw 'JOURNAL_DB_DIVERGENCE' }
  }
  $journalRank = $phaseRank[$journalPhase]
  $allowedExternalAdvance = ($journalPhase -eq 'objects_deleted' -and $databaseRank -eq 1) `
    -or ($journalPhase -eq 'auth_deleted' -and $databaseRank -eq 3)
  if ($journalRank -gt $databaseRank -and -not $allowedExternalAdvance) {
    throw 'JOURNAL_DB_DIVERGENCE'
  }

  $stage = 'PREPARE'
  $prepared = Invoke-PurgeRpc 'loopedin_prepare_account_purge' @{
    target_operation_id = $OperationId
    target_lease_owner = $LeaseOwner
  }
  $planDigest = [string]$prepared.planDigest
  $objectCount = [int]$prepared.objectCount
  $counts = if ($prepared.counts) { $prepared.counts } else { @{} }
  $objectPaths = @($prepared.objectPaths)
  if ($objectPaths.Count -ne $objectCount) { throw 'PLAN_OBJECT_COUNT_MISMATCH' }
  if ($prepared.backupExpiresAfter) {
    $requiredRetention = [DateTimeOffset]::Parse([string]$prepared.backupExpiresAfter).AddDays(1)
    if ($requiredRetention -gt $retainUntil) { $retainUntil = $requiredRetention }
  }
  if ($phaseRank[$journalPhase] -lt $phaseRank['prepared']) {
    Add-JournalCheckpoint 'prepared'
    $journalPhase = 'prepared'
  }
  Stop-ForLocalFailureInjection 'PREPARED'

  $stage = 'OBJECT_DELETE'
  if ($phaseRank[$journalPhase] -lt $phaseRank['objects_deleted'] -and $objectPaths.Count -gt 0) { Remove-PrivateObjects $objectPaths }
  Assert-PrivateObjectsAbsent $objectPaths
  if ($phaseRank[$journalPhase] -lt $phaseRank['objects_deleted']) {
    Add-JournalCheckpoint 'objects_deleted'
    $journalPhase = 'objects_deleted'
  }
  Stop-ForLocalFailureInjection 'OBJECTS_DELETED'

  $stage = 'RELATIONAL_FINALIZE'
  Refresh-Lease
  $finalized = Invoke-PurgeRpc 'loopedin_finalize_account_purge_relational' @{
    target_operation_id = $OperationId
    target_lease_owner = $LeaseOwner
    target_plan_digest = $planDigest
  }
  if ([string]$finalized.status -notin @('relational_finalized', 'completed')) { throw 'RELATIONAL_FINALIZE_FAILED' }
  Stop-ForLocalFailureInjection 'RELATIONAL_FINALIZED_BEFORE_CHECKPOINT'
  if ($phaseRank[$journalPhase] -lt $phaseRank['relational_finalized']) {
    Add-JournalCheckpoint 'relational_finalized'
    $journalPhase = 'relational_finalized'
  }

  $stage = 'AUTH_DELETE'
  $authUri = "$($env:SUPABASE_URL)/auth/v1/admin/users/$($UserId.ToLowerInvariant())"
  if ($phaseRank[$journalPhase] -lt $phaseRank['auth_deleted']) {
    $deleteResponse = Invoke-WebRequest -Method Delete -Uri $authUri -Headers $headers -SkipHttpErrorCheck
    if ([int]$deleteResponse.StatusCode -notin @(200, 204, 404)) { throw 'AUTH_DELETE_FAILED' }
  }
  $verifyResponse = Invoke-WebRequest -Method Get -Uri $authUri -Headers $headers -SkipHttpErrorCheck
  if ([int]$verifyResponse.StatusCode -ne 404) { throw 'AUTH_VERIFY_FAILED' }
  Stop-ForLocalFailureInjection 'AUTH_DELETED_BEFORE_CHECKPOINT'
  if ($phaseRank[$journalPhase] -lt $phaseRank['auth_deleted']) {
    Add-JournalCheckpoint 'auth_deleted'
    $journalPhase = 'auth_deleted'
  }

  $stage = 'COMPLETE'
  Refresh-Lease
  $completed = Invoke-PurgeRpc 'loopedin_complete_account_purge' @{
    target_operation_id = $OperationId
    target_lease_owner = $LeaseOwner
    target_plan_digest = $planDigest
  }
  if ([string]$completed.status -notin @('completed', 'already_completed')) { throw 'PURGE_COMPLETE_FAILED' }
  if ($phaseRank[$journalPhase] -lt $phaseRank['completed']) {
    Add-JournalCheckpoint 'completed'
    $journalPhase = 'completed'
  }
  Write-Output "Account purge operation $OperationId completed with digest $planDigest and $objectCount verified private objects."
}
catch {
  $failureMessage = [string]$_.Exception.Message
  $failureCode = if ($failureMessage -match '^[A-Z][A-Z0-9_]{2,31}$') { $failureMessage } else { "$($stage)_FAILED" }
  try { Add-JournalCheckpoint 'failed' $failureCode } catch { }
  throw "Account purge operation $OperationId stopped at stage $stage with bounded code $failureCode."
}
