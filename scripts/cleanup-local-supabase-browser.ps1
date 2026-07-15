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

if (-not $values['API_URL'] -or -not $values['SERVICE_ROLE_KEY']) {
  throw 'Local Supabase is not running. Start Docker, then run supabase start.'
}
$apiUri = [Uri]$values['API_URL']
if ($apiUri.Host -notin @('127.0.0.1', 'localhost', '::1')) {
  throw 'Browser proof cleanup only runs against loopback Supabase.'
}

$env:SUPABASE_URL = $values['API_URL']
$env:SUPABASE_SERVICE_ROLE_KEY = $values['SERVICE_ROLE_KEY']
$env:SUPABASE_DB_CONTAINER = 'supabase_db_family-loop'
$env:BROWSER_E2E_RUN_MARKER = $RunMarker
$env:BROWSER_E2E_INCLUDE_OUTSIDER = 'false'

node tests/provision-local-supabase-browser.mjs cleanup
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
