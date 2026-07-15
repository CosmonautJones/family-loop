param(
  [ValidatePattern('^[a-z0-9][a-z0-9-]{2,39}$')]
  [string]$RunMarker = 'family-browser-v1',
  [string]$Password = 'Local-browser-proof-42!',
  [string]$WebUrl = 'http://127.0.0.1:8090'
)

$ErrorActionPreference = 'Stop'
$values = @{}
$nativePreference = $PSNativeCommandUseErrorActionPreference
$PSNativeCommandUseErrorActionPreference = $false
supabase status -o env 2>$null | ForEach-Object {
  if ($_ -match '^([A-Z_]+)="([^"]*)"$') { $values[$matches[1]] = $matches[2] }
  elseif ($_ -match '^([A-Z_]+)=([^\s]+)$') { $values[$matches[1]] = $matches[2] }
}
$PSNativeCommandUseErrorActionPreference = $nativePreference
if (-not $values['API_URL']) { throw 'Local Supabase is not running.' }
$apiUri = [Uri]$values['API_URL']
$webUri = [Uri]$WebUrl
if ($apiUri.Host -notin @('127.0.0.1', 'localhost', '::1') -or $webUri.Host -notin @('127.0.0.1', 'localhost', '::1')) { throw 'Data export browser proof only runs on loopback.' }

$env:LOOPEDIN_LOCAL_PASSWORD = $Password
$env:LOOPEDIN_RUN_MARKER = $RunMarker
$env:LOOPEDIN_WEB_URL = $WebUrl
node tests/browser-data-export-e2e.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
