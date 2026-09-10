param(
  [switch]$AcknowledgeStagingOnly,
  [switch]$PreflightOnly,
  [Parameter(Mandatory = $true)][string]$ArtifactPath,
  [Parameter(Mandatory = $true)][ValidatePattern('^[0-9a-f]{40}$')][string]$ExpectedSourceCommit,
  [Parameter(Mandatory = $true)][ValidatePattern('^[0-9a-f]{64}$')][string]$ExpectedArtifactSha256,
  [Parameter(Mandatory = $true)][ValidatePattern('^[A-Za-z0-9][A-Za-z0-9._/-]{2,119}$')][string]$ApprovalReference
)

$ErrorActionPreference = 'Stop'
$projectRef = 'vkogznsfthirhxkqysza'
$quarantinedRef = 'lzscofbvecgpchokxhyb'

if (-not $PreflightOnly -and -not $AcknowledgeStagingOnly) {
  throw 'Refusing hosted invitation QA without -AcknowledgeStagingOnly.'
}
if ($projectRef -eq $quarantinedRef) {
  throw 'Refusing the quarantined Supabase project.'
}

$artifactFullPath = (Resolve-Path -LiteralPath $ArtifactPath).Path
& node (Join-Path $PSScriptRoot 'hosted-invitation-release.mjs') $artifactFullPath $ExpectedSourceCommit $ExpectedArtifactSha256 $ApprovalReference
if ($LASTEXITCODE -ne 0) { throw 'Exact-candidate preflight failed before credential retrieval or hosted fixture creation.' }
if ($PreflightOnly) { return }

$rawKeys = $null
try {
  $rawKeys = & supabase projects api-keys --project-ref $projectRef --reveal --output json 2>$null
  if ($LASTEXITCODE -ne 0) { throw 'CLI failure' }
  $keys = @($rawKeys | ConvertFrom-Json)
  $publishable = $keys | Where-Object {
    $_.name -eq 'publishable' -or $_.type -eq 'publishable' -or $_.api_key -like 'sb_publishable_*' -or $_.key -like 'sb_publishable_*'
  } | Select-Object -First 1
  $secret = $keys | Where-Object {
    $_.name -eq 'secret' -or $_.type -eq 'secret' -or $_.api_key -like 'sb_secret_*' -or $_.key -like 'sb_secret_*'
  } | Select-Object -First 1
  $publishableValue = @($publishable.api_key, $publishable.key, $publishable.value).Where({ $_ -like 'sb_publishable_*' }) | Select-Object -First 1
  $secretValue = @($secret.api_key, $secret.key, $secret.value).Where({ $_ -like 'sb_secret_*' }) | Select-Object -First 1
  if (-not $publishableValue -or -not $secretValue) { throw 'Expected key types unavailable' }
} catch {
  throw 'Unable to retrieve the dedicated staging publishable and secret keys from the authenticated Supabase CLI.'
} finally {
  $rawKeys = $null
}

$previous = @{}
foreach ($name in @('LOOPEDIN_HOSTED_PROJECT_REF', 'LOOPEDIN_HOSTED_STAGING_ACK', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY', 'LOOPEDIN_QA_ARTIFACT_PATH', 'LOOPEDIN_QA_SOURCE_COMMIT', 'LOOPEDIN_QA_ARTIFACT_SHA256', 'LOOPEDIN_QA_APPROVAL_REFERENCE')) {
  $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}
try {
  $env:LOOPEDIN_HOSTED_PROJECT_REF = $projectRef
  $env:LOOPEDIN_HOSTED_STAGING_ACK = 'I_ACKNOWLEDGE_LOOPEDIN_STAGING_ONLY'
  $env:SUPABASE_URL = "https://$projectRef.supabase.co"
  $env:SUPABASE_PUBLISHABLE_KEY = $publishableValue
  $env:SUPABASE_SECRET_KEY = $secretValue
  $env:LOOPEDIN_QA_ARTIFACT_PATH = $artifactFullPath
  $env:LOOPEDIN_QA_SOURCE_COMMIT = $ExpectedSourceCommit
  $env:LOOPEDIN_QA_ARTIFACT_SHA256 = $ExpectedArtifactSha256
  $env:LOOPEDIN_QA_APPROVAL_REFERENCE = $ApprovalReference
  & node (Join-Path $PSScriptRoot '../tests/hosted-browser-invitation-e2e.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Hosted staging invitation QA failed; provider detail was redacted.' }
} finally {
  $keys = $null
  $publishable = $null
  $secret = $null
  $publishableValue = $null
  $secretValue = $null
  foreach ($name in $previous.Keys) {
    [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process')
  }
}
