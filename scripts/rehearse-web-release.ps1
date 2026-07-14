param(
  [Parameter(Mandatory = $true)]
  [string]$BaselineArtifact,
  [Parameter(Mandatory = $true)]
  [string]$CandidateArtifact,
  [Parameter(Mandatory = $true)]
  [string]$WorkPath,
  [Parameter(Mandatory = $true)]
  [string]$PrimaryRuntimeConfig,
  [Parameter(Mandatory = $true)]
  [string]$SecondaryRuntimeConfig,
  [int]$Port = 8087
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$work = if ([IO.Path]::IsPathRooted($WorkPath)) {
  [IO.Path]::GetFullPath($WorkPath)
} else {
  [IO.Path]::GetFullPath((Join-Path (Get-Location) $WorkPath))
}
$driveRoot = [IO.Path]::GetPathRoot($work)
if ($work -eq $repositoryRoot -or $work -eq $driveRoot -or $repositoryRoot.StartsWith($work.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing unsafe rehearsal work path: $work"
}
$baseline = (Resolve-Path -LiteralPath $BaselineArtifact).Path
$candidate = (Resolve-Path -LiteralPath $CandidateArtifact).Path
$primaryConfigPath = (Resolve-Path -LiteralPath $PrimaryRuntimeConfig).Path
$secondaryConfigPath = (Resolve-Path -LiteralPath $SecondaryRuntimeConfig).Path
$primaryConfig = Get-Content -Raw -LiteralPath $primaryConfigPath | ConvertFrom-Json
$secondaryConfig = Get-Content -Raw -LiteralPath $secondaryConfigPath | ConvertFrom-Json
if ($primaryConfig.dataMode -ne 'local') { throw 'PrimaryRuntimeConfig must use local mode for the full mobile-web smoke.' }
if ($primaryConfig.environmentId -eq $secondaryConfig.environmentId) { throw 'Runtime config environments must have distinct identifiers.' }
$baselineManifest = Get-Content -Raw -LiteralPath (Join-Path $baseline 'release-manifest.json') | ConvertFrom-Json
$candidateManifest = Get-Content -Raw -LiteralPath (Join-Path $candidate 'release-manifest.json') | ConvertFrom-Json
if ($baselineManifest.artifactSha256 -eq $candidateManifest.artifactSha256) {
  throw 'Rollback rehearsal requires two distinct immutable artifacts.'
}

$baselineAssets = @{}
foreach ($file in $baselineManifest.files) {
  if ($file.path -match '^(?:_expo/static|assets)/.+[0-9a-f]{8,}') { $baselineAssets[$file.path] = $file.sha256 }
}
foreach ($file in $candidateManifest.files) {
  if ($baselineAssets.ContainsKey($file.path) -and $baselineAssets[$file.path] -ne $file.sha256) {
    throw "Hashed asset path changed bytes across releases: $($file.path)"
  }
}

if (Test-Path -LiteralPath $work) {
  Remove-Item -LiteralPath $work -Recurse -Force
}
New-Item -ItemType Directory -Path $work -Force | Out-Null
$store = Join-Path $work 'store'
$stdoutPath = Join-Path $work 'server.stdout.log'
$stderrPath = Join-Path $work 'server.stderr.log'
$liveConfigPath = Join-Path $work 'runtime-config.json'
$server = $null

function Promote([string]$Artifact) {
  & (Join-Path $PSScriptRoot 'promote-web-release.ps1') -ArtifactPath $Artifact -ReleaseStore $store -Alias stable
}

function Get-ReleaseResponse([string]$Path) {
  return Invoke-WebRequest -Uri "http://127.0.0.1:$Port$Path" -UseBasicParsing -TimeoutSec 10
}

try {
  Copy-Item -LiteralPath $primaryConfigPath -Destination $liveConfigPath
  Promote $baseline
  $server = Start-Process -FilePath 'node' -ArgumentList @(
    (Join-Path $PSScriptRoot 'serve-web-release.mjs'),
    '--store', $store,
    '--runtime-config', $liveConfigPath,
    '--alias', 'stable',
    '--port', $Port
  ) -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -WindowStyle Hidden -PassThru
  for ($attempt = 0; $attempt -lt 100; $attempt += 1) {
    try {
      $baselineResponse = Get-ReleaseResponse '/family/trip/reload-proof'
      break
    } catch {
      if ($server.HasExited) { throw "Release server stopped unexpectedly: $(Get-Content -Raw -LiteralPath $stderrPath)" }
      Start-Sleep -Milliseconds 50
    }
  }
  if (-not $baselineResponse) { throw 'Release server did not become ready.' }
  if ($baselineResponse.Headers['X-LoopedIn-Release'] -ne $baselineManifest.releaseId) { throw 'Baseline alias served the wrong release.' }
  if ($baselineResponse.Headers['X-LoopedIn-Environment'] -ne $primaryConfig.environmentId) { throw 'Primary runtime environment identity is wrong.' }
  if ($baselineResponse.Headers['Content-Security-Policy'] -notmatch "frame-ancestors 'none'") { throw 'CSP header is missing the frame restriction.' }
  if ($baselineResponse.Headers['Cache-Control'] -ne 'no-cache') { throw 'SPA fallback must revalidate instead of using an immutable cache.' }
  $securityHeaders = @(
    'Content-Security-Policy',
    'Cross-Origin-Opener-Policy',
    'Permissions-Policy',
    'Referrer-Policy',
    'X-Content-Type-Options',
    'X-Frame-Options'
  )
  foreach ($header in $securityHeaders) {
    if (-not $baselineResponse.Headers[$header]) { throw "Baseline response is missing $header." }
  }
  $primaryRuntimeResponse = Get-ReleaseResponse '/runtime-config.json'
  if ($primaryRuntimeResponse.Headers['Cache-Control'] -ne 'no-store') { throw 'Runtime config must never be cached.' }
  if (($primaryRuntimeResponse.Content | ConvertFrom-Json).environmentId -ne $primaryConfig.environmentId) { throw 'Primary runtime config response is wrong.' }

  Promote $candidate
  $candidateResponse = Get-ReleaseResponse '/event/event-door-county'
  if ($candidateResponse.Headers['X-LoopedIn-Release'] -ne $candidateManifest.releaseId) { throw 'Candidate alias served the wrong release.' }
  foreach ($header in $securityHeaders) {
    if ($candidateResponse.Headers[$header] -ne $baselineResponse.Headers[$header]) { throw "$header changed during candidate promotion." }
  }
  $candidateAsset = $candidateManifest.files | Where-Object { $_.path -match '^(?:_expo/static|assets)/.+[0-9a-f]{8,}' } | Select-Object -First 1
  if (-not $candidateAsset) { throw 'Candidate manifest contains no hashed static asset.' }
  $assetResponse = Get-ReleaseResponse "/$($candidateAsset.path)"
  if ($assetResponse.Headers['Cache-Control'] -ne 'public, max-age=31536000, immutable') { throw 'Hashed asset lacks immutable cache policy.' }

  & node (Join-Path $PSScriptRoot 'check-opord14-mobile-accessibility.mjs') "http://127.0.0.1:$Port"
  if ($LASTEXITCODE -ne 0) { throw 'Candidate mobile-web smoke failed.' }

  Copy-Item -LiteralPath $secondaryConfigPath -Destination $liveConfigPath -Force
  $secondaryResponse = Get-ReleaseResponse '/event/runtime-config-proof'
  if ($secondaryResponse.Headers['X-LoopedIn-Release'] -ne $candidateManifest.releaseId) { throw 'Runtime overlay changed the immutable artifact identity.' }
  if ($secondaryResponse.Headers['X-LoopedIn-Environment'] -ne $secondaryConfig.environmentId) { throw 'Secondary runtime environment identity is wrong.' }
  if ($secondaryConfig.dataMode -eq 'supabase') {
    $backendOrigin = ([Uri]$secondaryConfig.supabaseUrl).GetLeftPart([UriPartial]::Authority)
    if ($secondaryResponse.Headers['Content-Security-Policy'] -notmatch [regex]::Escape($backendOrigin)) { throw 'CSP does not allow the configured backend origin.' }
    & node (Join-Path $PSScriptRoot 'check-runtime-config-browser.mjs') "http://127.0.0.1:$Port/#/event/runtime-config-proof" $secondaryConfig.environmentId 'Welcome back'
  } else {
    & node (Join-Path $PSScriptRoot 'check-runtime-config-browser.mjs') "http://127.0.0.1:$Port/#/home" $secondaryConfig.environmentId 'Who’s using LoopedIn?'
  }
  if ($LASTEXITCODE -ne 0) { throw 'Secondary runtime browser smoke failed.' }

  [IO.File]::WriteAllText($liveConfigPath, '{"schemaVersion":1,"environmentId":"invalid-proof","dataMode":"supabase","supabaseUrl":"https://example.invalid","supabasePublishableKey":"sb_secret_rejected"}', [Text.UTF8Encoding]::new($false))
  $invalidRuntimeResponse = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/runtime-config.json" -UseBasicParsing -TimeoutSec 10 -SkipHttpErrorCheck
  if ($invalidRuntimeResponse.StatusCode -ne 503 -or $invalidRuntimeResponse.Headers['Cache-Control'] -ne 'no-store') { throw 'Invalid runtime config did not fail closed.' }
  $invalidShellResponse = Get-ReleaseResponse '/event/runtime-config-proof'
  if ($invalidShellResponse.Headers['X-LoopedIn-Environment'] -ne 'unavailable') { throw 'Invalid runtime config leaked an environment identity.' }
  & node (Join-Path $PSScriptRoot 'check-runtime-config-browser.mjs') "http://127.0.0.1:$Port/#/event/runtime-config-proof" invalid-proof 'LoopedIn is unavailable'
  if ($LASTEXITCODE -ne 0) { throw 'Invalid runtime browser state did not fail closed.' }

  Copy-Item -LiteralPath $primaryConfigPath -Destination $liveConfigPath -Force
  Promote $baseline
  $rollbackResponse = Get-ReleaseResponse '/event/event-door-county'
  if ($rollbackResponse.Headers['X-LoopedIn-Release'] -ne $baselineManifest.releaseId) { throw 'Rollback did not restore the baseline release.' }
  if ($rollbackResponse.Headers['X-LoopedIn-Environment'] -ne $primaryConfig.environmentId) { throw 'Rollback did not restore the primary runtime environment.' }
  foreach ($header in $securityHeaders) {
    if ($rollbackResponse.Headers[$header] -ne $candidateResponse.Headers[$header]) { throw "$header changed after rollback." }
  }

  Write-Output "Baseline release: $($baselineManifest.releaseId)"
  Write-Output "Candidate release: $($candidateManifest.releaseId)"
  Write-Output "One candidate artifact across two runtime environments, invalid-config fail-closed, mobile smoke, deep-link fallback, immutable asset cache, and artifact/config rollback: PASS"
} finally {
  if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force
    $server.WaitForExit()
  }
}
