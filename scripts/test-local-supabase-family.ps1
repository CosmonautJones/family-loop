$ErrorActionPreference = 'Stop'

$values = @{}
$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
& supabase status -o env 2>$null | ForEach-Object {
  if ($_ -match '^([A-Z_]+)="([^"]*)"$') { $values[$matches[1]] = $matches[2] }
  elseif ($_ -match '^([A-Z_]+)=([^\s]+)$') { $values[$matches[1]] = $matches[2] }
}
$ErrorActionPreference = $previousErrorActionPreference

if (-not $values['API_URL'] -or -not $values['ANON_KEY'] -or -not $values['SERVICE_ROLE_KEY']) {
  throw 'Local Supabase is not running. Start Docker, then run supabase start.'
}

$apiUri = [Uri]$values['API_URL']
if ($apiUri.Host -notin @('127.0.0.1', 'localhost', '::1')) {
  throw 'This destructive family test only runs against loopback Supabase.'
}

$env:SUPABASE_URL = $values['API_URL']
$env:SUPABASE_ANON_KEY = $values['ANON_KEY']
$env:SUPABASE_SERVICE_ROLE_KEY = $values['SERVICE_ROLE_KEY']

node tests/supabase-family-e2e.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
