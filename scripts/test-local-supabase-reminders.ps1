param(
  [ValidatePattern('^[a-z0-9][a-z0-9-]{2,39}$')]
  [string]$RunMarker = 'family-browser-v1',
  [string]$Password = 'Local-browser-proof-42!'
)

$ErrorActionPreference = 'Stop'
$values = @{}
supabase status -o env 2>$null | ForEach-Object {
  if ($_ -match '^([A-Z_]+)="([^"]*)"$') { $values[$matches[1]] = $matches[2] }
  elseif ($_ -match '^([A-Z_]+)=([^\s]+)$') { $values[$matches[1]] = $matches[2] }
}
if (-not $values['API_URL']) { throw 'Local Supabase is not running.' }
$uri = [Uri]$values['API_URL']
if ($uri.Host -notin @('127.0.0.1', 'localhost', '::1')) { throw 'Reminder proof only runs against loopback Supabase.' }

$env:SUPABASE_URL = $values['API_URL']
$env:SUPABASE_PUBLISHABLE_KEY = $values['PUBLISHABLE_KEY']
$env:LOOPEDIN_LOCAL_PASSWORD = $Password
$env:LOOPEDIN_RUN_MARKER = $RunMarker
node tests/supabase-reminder-e2e.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
