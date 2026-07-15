param(
  [Parameter(Mandatory = $true)][string]$OwnerEmail,
  [Parameter(Mandatory = $true)][string]$OwnerName,
  [Parameter(Mandatory = $true)][string]$FamilyName,
  [switch]$AcknowledgeRealOwnerData
)

$ErrorActionPreference = 'Stop'
$projectRef = 'vkogznsfthirhxkqysza'
$quarantinedRef = 'lzscofbvecgpchokxhyb'

if (-not $AcknowledgeRealOwnerData) { throw 'Refusing real-owner seed without -AcknowledgeRealOwnerData.' }
if ($projectRef -eq $quarantinedRef) { throw 'Refusing the quarantined Supabase project.' }
if ([string]::IsNullOrWhiteSpace($OwnerEmail) -or [string]::IsNullOrWhiteSpace($OwnerName) -or [string]::IsNullOrWhiteSpace($FamilyName)) {
  throw 'OwnerEmail, OwnerName, and FamilyName are required.'
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
  throw 'Unable to retrieve the dedicated staging keys from the authenticated Supabase CLI.'
} finally {
  $rawKeys = $null
}

$names = @(
  'LOOPEDIN_HOSTED_PROJECT_REF', 'LOOPEDIN_REAL_OWNER_ACK', 'LOOPEDIN_OWNER_EMAIL', 'LOOPEDIN_OWNER_NAME',
  'LOOPEDIN_FAMILY_NAME', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY'
)
$previous = @{}
foreach ($name in $names) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
try {
  $env:LOOPEDIN_HOSTED_PROJECT_REF = $projectRef
  $env:LOOPEDIN_REAL_OWNER_ACK = 'I_ACKNOWLEDGE_LOOPEDIN_REAL_OWNER_STARTER_DATA'
  $env:LOOPEDIN_OWNER_EMAIL = $OwnerEmail
  $env:LOOPEDIN_OWNER_NAME = $OwnerName
  $env:LOOPEDIN_FAMILY_NAME = $FamilyName
  $env:SUPABASE_URL = "https://$projectRef.supabase.co"
  $env:SUPABASE_PUBLISHABLE_KEY = $publishableValue
  $env:SUPABASE_SECRET_KEY = $secretValue
  & node scripts/seed-hosted-owner-starter.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Hosted owner starter-data seed failed; provider detail was redacted.' }
} finally {
  $keys = $null
  $publishable = $null
  $secret = $null
  $publishableValue = $null
  $secretValue = $null
  foreach ($name in $previous.Keys) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
}
