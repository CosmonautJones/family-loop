param(
  [switch]$AcknowledgeStagingOnly
)

$ErrorActionPreference = 'Stop'
$projectRef = 'vkogznsfthirhxkqysza'
$quarantinedRef = 'lzscofbvecgpchokxhyb'

if (-not $AcknowledgeStagingOnly) {
  throw 'Refusing hosted invitation QA without -AcknowledgeStagingOnly.'
}
if ($projectRef -eq $quarantinedRef) {
  throw 'Refusing the quarantined Supabase project.'
}

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
foreach ($name in @('LOOPEDIN_HOSTED_PROJECT_REF', 'LOOPEDIN_HOSTED_STAGING_ACK', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY')) {
  $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}
try {
  $env:LOOPEDIN_HOSTED_PROJECT_REF = $projectRef
  $env:LOOPEDIN_HOSTED_STAGING_ACK = 'I_ACKNOWLEDGE_LOOPEDIN_STAGING_ONLY'
  $env:SUPABASE_URL = "https://$projectRef.supabase.co"
  $env:SUPABASE_PUBLISHABLE_KEY = $publishableValue
  $env:SUPABASE_SECRET_KEY = $secretValue
  & node tests/hosted-browser-invitation-e2e.mjs
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
