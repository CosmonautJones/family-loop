param(
  [Parameter(Mandatory = $true)][string]$ReleaseId,
  [switch]$AcknowledgeStagingOnly
)

$ErrorActionPreference = 'Stop'
$projectRef = 'vkogznsfthirhxkqysza'
$quarantinedRef = 'lzscofbvecgpchokxhyb'

if (-not $AcknowledgeStagingOnly) { throw 'Refusing hosted telemetry proof without -AcknowledgeStagingOnly.' }
if ($projectRef -eq $quarantinedRef) { throw 'Refusing the quarantined Supabase project.' }
if ($ReleaseId -notmatch '^\d{1,3}\.\d{1,3}\.\d{1,3}-[0-9a-f]{12}$') { throw 'ReleaseId is invalid.' }

$rawKeys = $null
try {
  $rawKeys = & supabase projects api-keys --project-ref $projectRef --reveal --output json 2>$null
  if ($LASTEXITCODE -ne 0) { throw 'CLI failure' }
  $keys = @($rawKeys | ConvertFrom-Json)
  $publishableValue = @($keys | ForEach-Object { $_.api_key; $_.key; $_.value }).Where({ $_ -like 'sb_publishable_*' }) | Select-Object -First 1
  $secretValue = @($keys | ForEach-Object { $_.api_key; $_.key; $_.value }).Where({ $_ -like 'sb_secret_*' }) | Select-Object -First 1
  if (-not $publishableValue -or -not $secretValue) { throw 'Expected key types unavailable' }
} catch {
  throw 'Unable to retrieve dedicated staging keys from the authenticated Supabase CLI.'
} finally {
  $rawKeys = $null
}

$names = @('SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY', 'LOOPEDIN_TELEMETRY_RELEASE', 'LOOPEDIN_TELEMETRY_STAGING_ACK')
$previous = @{}
foreach ($name in $names) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
try {
  $env:SUPABASE_URL = "https://$projectRef.supabase.co"
  $env:SUPABASE_PUBLISHABLE_KEY = $publishableValue
  $env:SUPABASE_SECRET_KEY = $secretValue
  $env:LOOPEDIN_TELEMETRY_RELEASE = $ReleaseId
  $env:LOOPEDIN_TELEMETRY_STAGING_ACK = 'I_ACKNOWLEDGE_LOOPEDIN_STAGING_TELEMETRY'
  & node scripts/prove-hosted-error-telemetry.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Hosted telemetry proof failed; provider detail was redacted.' }
} finally {
  $keys = $null
  $publishableValue = $null
  $secretValue = $null
  foreach ($name in $previous.Keys) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
}
