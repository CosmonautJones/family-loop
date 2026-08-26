param(
  [Parameter(Mandatory = $true)]
  [string]$OutputPath,
  [string]$SourceRevision = 'HEAD'
)

$ErrorActionPreference = 'Stop'
$onWindows = [Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$outputFullPath = if ([IO.Path]::IsPathRooted($OutputPath)) {
  [IO.Path]::GetFullPath($OutputPath)
} else {
  [IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
}
$driveRoot = [IO.Path]::GetPathRoot($outputFullPath)
if ($outputFullPath -eq $repositoryRoot -or $outputFullPath -eq $driveRoot -or $repositoryRoot.StartsWith($outputFullPath.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing unsafe release output path: $outputFullPath"
}

$sourceCommit = (& git -C $repositoryRoot rev-parse "$SourceRevision^{commit}").Trim()
if ($LASTEXITCODE -ne 0 -or $sourceCommit -notmatch '^[0-9a-f]{40}$') {
  throw "SourceRevision does not resolve to a commit: $SourceRevision"
}
$sourceEpoch = (& git -C $repositoryRoot show -s --format=%ct $sourceCommit).Trim()
if ($LASTEXITCODE -ne 0 -or $sourceEpoch -notmatch '^\d+$') {
  throw "Could not read the commit timestamp for $sourceCommit"
}
$trackedEnvironmentFiles = @(& git -C $repositoryRoot ls-tree -r --name-only $sourceCommit | Where-Object {
  $name = [IO.Path]::GetFileName($_)
  $name -like '.env*' -and $name -notmatch '\.(example|sample|template)$'
})
if ($trackedEnvironmentFiles.Count -gt 0) {
  throw 'Source commit contains a tracked environment file; refusing to build a release artifact.'
}

$temporaryRoot = Join-Path ([IO.Path]::GetTempPath()) ("loopedin-release-" + [guid]::NewGuid().ToString('N'))
$sourcePath = Join-Path $temporaryRoot 'source'
$exportPath = Join-Path $sourcePath 'app/release-export'
$archivePath = Join-Path $temporaryRoot 'source.tar'

function Get-TextSha256([string]$Text) {
  $bytes = [Text.Encoding]::UTF8.GetBytes($Text)
  $sha = [Security.Cryptography.SHA256]::Create()
  try {
    return ([BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-', '')).ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

function Invoke-BoundedProcess(
  [string]$FilePath,
  [string[]]$Arguments,
  [string]$WorkingDirectory,
  [int]$TimeoutSeconds,
  [string]$Label
) {
  $stdoutPath = Join-Path $temporaryRoot "$Label.stdout.log"
  $stderrPath = Join-Path $temporaryRoot "$Label.stderr.log"
  $startProcessArguments = @{
    FilePath = $FilePath
    ArgumentList = $Arguments
    WorkingDirectory = $WorkingDirectory
    RedirectStandardOutput = $stdoutPath
    RedirectStandardError = $stderrPath
    PassThru = $true
  }
  if ($onWindows) {
    $startProcessArguments.WindowStyle = 'Hidden'
  }
  $process = Start-Process @startProcessArguments
  if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
    if ($onWindows) {
      & taskkill /PID $process.Id /T /F | Out-Null
    } else {
      Stop-Process -Id $process.Id -Force
    }
    if (Test-Path -LiteralPath $stdoutPath) { Get-Content -Tail 40 -LiteralPath $stdoutPath }
    if (Test-Path -LiteralPath $stderrPath) { Get-Content -Tail 40 -LiteralPath $stderrPath | ForEach-Object { [Console]::Error.WriteLine($_) } }
    throw "$Label exceeded its $TimeoutSeconds-second limit."
  }
  $process.WaitForExit()
  if (Test-Path -LiteralPath $stdoutPath) { Get-Content -LiteralPath $stdoutPath }
  if (Test-Path -LiteralPath $stderrPath) { Get-Content -LiteralPath $stderrPath | ForEach-Object { [Console]::Error.WriteLine($_) } }
  if ($process.ExitCode -ne 0) {
    throw "$Label failed with exit code $($process.ExitCode)."
  }
}

$environmentNames = @(
  'EXPO_NO_DOTENV',
  'EXPO_PUBLIC_DATA_MODE',
  'EXPO_PUBLIC_RELEASE_ID',
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SOURCE_DATE_EPOCH'
)
$savedEnvironment = @{}
foreach ($name in $environmentNames) {
  $savedEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}

try {
  New-Item -ItemType Directory -Path $sourcePath -Force | Out-Null
  & git -C $repositoryRoot archive --format=tar --output=$archivePath $sourceCommit
  if ($LASTEXITCODE -ne 0) { throw 'git archive failed.' }
  & tar -xf $archivePath -C $sourcePath
  if ($LASTEXITCODE -ne 0) { throw 'Source archive extraction failed.' }

  $package = Get-Content -Raw -LiteralPath (Join-Path $sourcePath 'app/package.json') | ConvertFrom-Json
  $releaseId = "$($package.version)-$($sourceCommit.Substring(0, 12))"
  if ($releaseId -notmatch '^\d{1,3}\.\d{1,3}\.\d{1,3}-[0-9a-f]{12}$') {
    throw 'Release identity does not match the bounded telemetry contract.'
  }

  [Environment]::SetEnvironmentVariable('EXPO_NO_DOTENV', '1', 'Process')
  [Environment]::SetEnvironmentVariable('EXPO_PUBLIC_DATA_MODE', 'runtime', 'Process')
  [Environment]::SetEnvironmentVariable('EXPO_PUBLIC_RELEASE_ID', $releaseId, 'Process')
  Remove-Item Env:EXPO_PUBLIC_SUPABASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:EXPO_PUBLIC_SUPABASE_ANON_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY -ErrorAction SilentlyContinue
  [Environment]::SetEnvironmentVariable('SOURCE_DATE_EPOCH', $sourceEpoch, 'Process')

  $appPath = Join-Path $sourcePath 'app'
  if ($onWindows) {
    $shell = (Get-Command cmd.exe).Source
    Invoke-BoundedProcess $shell @('/d', '/s', '/c', 'npm ci --no-audit --no-fund') $appPath 300 'npm-ci'
    Invoke-BoundedProcess $shell @('/d', '/s', '/c', 'node scripts\ensure-metro-compat.cjs') $appPath 60 'metro-compat'
    Invoke-BoundedProcess $shell @('/d', '/s', '/c', "npx expo export --platform web --output-dir `"$exportPath`" --clear") $appPath 300 'expo-export'
  } else {
    Invoke-BoundedProcess (Get-Command npm).Source @('ci', '--no-audit', '--no-fund') $appPath 300 'npm-ci'
    Invoke-BoundedProcess (Get-Command node).Source @('scripts/ensure-metro-compat.cjs') $appPath 60 'metro-compat'
    Invoke-BoundedProcess (Get-Command npx).Source @('expo', 'export', '--platform', 'web', '--output-dir', $exportPath, '--clear') $appPath 300 'expo-export'
  }

  if (Test-Path -LiteralPath $outputFullPath) {
    Remove-Item -LiteralPath $outputFullPath -Recurse -Force
  }
  New-Item -ItemType Directory -Path $outputFullPath -Force | Out-Null
  Copy-Item -Path (Join-Path $exportPath '*') -Destination $outputFullPath -Recurse -Force

  $files = @(
    Get-ChildItem -LiteralPath $outputFullPath -Recurse -File |
      Sort-Object { $_.FullName.Substring($outputFullPath.Length + 1).Replace('\', '/') } |
      ForEach-Object {
        [ordered]@{
          path = $_.FullName.Substring($outputFullPath.Length + 1).Replace('\', '/')
          bytes = $_.Length
          sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        }
      }
  )
  $canonicalFiles = ($files | ForEach-Object { "$($_.path)`t$($_.bytes)`t$($_.sha256)" }) -join "`n"
  $canonicalArtifact = "schemaVersion=2`nappVersion=$($package.version)`ndataMode=runtime`nsourceCommit=$sourceCommit`nsourceDateEpoch=$sourceEpoch`n$canonicalFiles`n"
  $artifactDigest = Get-TextSha256 $canonicalArtifact
  $manifest = [ordered]@{
    schemaVersion = 2
    releaseId = $releaseId
    appVersion = $package.version
    dataMode = 'runtime'
    sourceCommit = $sourceCommit
    sourceDateEpoch = [long]$sourceEpoch
    artifactSha256 = $artifactDigest
    files = $files
  }
  $manifestJson = $manifest | ConvertTo-Json -Depth 6
  [IO.File]::WriteAllText((Join-Path $outputFullPath 'release-manifest.json'), $manifestJson + "`n", [Text.UTF8Encoding]::new($false))

  Write-Output "Release artifact: $outputFullPath"
  Write-Output "Release ID: $($manifest.releaseId)"
  Write-Output "Artifact SHA-256: $artifactDigest"
} finally {
  foreach ($name in $environmentNames) {
    [Environment]::SetEnvironmentVariable($name, $savedEnvironment[$name], 'Process')
  }
  $resolvedTemporaryRoot = [IO.Path]::GetFullPath($temporaryRoot)
  $systemTemp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
  if ($resolvedTemporaryRoot.StartsWith($systemTemp, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolvedTemporaryRoot)) {
    Remove-Item -LiteralPath $resolvedTemporaryRoot -Recurse -Force
  }
}
