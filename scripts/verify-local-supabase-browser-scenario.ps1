param(
  [ValidatePattern('^[a-z0-9][a-z0-9-]{2,39}$')]
  [string]$RunMarker = 'family-browser-v1'
)

$ErrorActionPreference = 'Stop'
$values = @{}
$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
& supabase status -o env 2>$null | ForEach-Object {
  if ($_ -match '^([A-Z_]+)="([^"]*)"$') { $values[$matches[1]] = $matches[2] }
  elseif ($_ -match '^([A-Z_]+)=([^\s]+)$') { $values[$matches[1]] = $matches[2] }
}
$ErrorActionPreference = $previousErrorActionPreference

if (-not $values['API_URL']) {
  throw 'Local Supabase is not running. Start Docker, then run supabase start.'
}
$apiUri = [Uri]$values['API_URL']
if ($apiUri.Host -notin @('127.0.0.1', 'localhost', '::1')) {
  throw 'Browser scenario verification only runs against loopback Supabase.'
}

$env:SUPABASE_URL = $values['API_URL']
$env:SUPABASE_DB_CONTAINER = 'supabase_db_family-loop'
$env:BROWSER_E2E_RUN_MARKER = $RunMarker

node tests/verify-local-supabase-browser-scenario.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
