param(
  [Parameter(Mandatory = $true)]
  [string]$ArtifactPath,
  [Parameter(Mandatory = $true)]
  [string]$ReleaseStore,
  [Parameter(Mandatory = $true)]
  [string]$Alias
)

$ErrorActionPreference = 'Stop'

if ($Alias -notmatch '^[a-z0-9][a-z0-9-]{0,62}$') {
  throw 'Alias must contain only lowercase letters, digits, and hyphens.'
}

$artifact = (Resolve-Path -LiteralPath $ArtifactPath).Path
$store = if ([IO.Path]::IsPathRooted($ReleaseStore)) {
  [IO.Path]::GetFullPath($ReleaseStore)
} else {
  [IO.Path]::GetFullPath((Join-Path (Get-Location) $ReleaseStore))
}
$manifestPath = Join-Path $artifact 'release-manifest.json'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
  throw 'Artifact is missing release-manifest.json.'
}
$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
if ($manifest.schemaVersion -notin @(1, 2) -or $manifest.artifactSha256 -notmatch '^[0-9a-f]{64}$') {
  throw 'Artifact manifest is invalid or unsupported.'
}
if ($manifest.schemaVersion -eq 2 -and ($manifest.dataMode -ne 'runtime' -or $null -ne $manifest.environmentId)) {
  throw 'Runtime artifact manifest contains environment-specific configuration.'
}

$actualFiles = @(
  Get-ChildItem -LiteralPath $artifact -Recurse -File |
    Where-Object { $_.FullName -ne $manifestPath } |
    Sort-Object { $_.FullName.Substring($artifact.Length + 1).Replace('\', '/') } |
    ForEach-Object {
      [pscustomobject]@{
        path = $_.FullName.Substring($artifact.Length + 1).Replace('\', '/')
        bytes = $_.Length
        sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
      }
    }
)
if ($actualFiles.Count -ne $manifest.files.Count) {
  throw 'Artifact file count does not match its manifest.'
}
for ($index = 0; $index -lt $actualFiles.Count; $index += 1) {
  $actual = $actualFiles[$index]
  $expected = $manifest.files[$index]
  if ($actual.path -ne $expected.path -or $actual.bytes -ne $expected.bytes -or $actual.sha256 -ne $expected.sha256) {
    throw "Artifact verification failed for $($actual.path)."
  }
}
$canonicalFiles = ($actualFiles | ForEach-Object { "$($_.path)`t$($_.bytes)`t$($_.sha256)" }) -join "`n"
$canonicalArtifact = if ($manifest.schemaVersion -eq 1) {
  "schemaVersion=1`nappVersion=$($manifest.appVersion)`nenvironmentId=$($manifest.environmentId)`ndataMode=$($manifest.dataMode)`nsourceCommit=$($manifest.sourceCommit)`nsourceDateEpoch=$($manifest.sourceDateEpoch)`n$canonicalFiles`n"
} else {
  "schemaVersion=2`nappVersion=$($manifest.appVersion)`ndataMode=runtime`nsourceCommit=$($manifest.sourceCommit)`nsourceDateEpoch=$($manifest.sourceDateEpoch)`n$canonicalFiles`n"
}
$bytes = [Text.Encoding]::UTF8.GetBytes($canonicalArtifact)
$sha = [Security.Cryptography.SHA256]::Create()
try {
  $actualDigest = ([BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-', '')).ToLowerInvariant()
} finally {
  $sha.Dispose()
}
if ($actualDigest -ne $manifest.artifactSha256) {
  throw 'Artifact digest does not match its manifest.'
}

$releasesPath = Join-Path $store 'releases'
$aliasesPath = Join-Path $store 'aliases'
$releasePath = Join-Path $releasesPath $actualDigest
New-Item -ItemType Directory -Path $releasesPath, $aliasesPath -Force | Out-Null
if (-not (Test-Path -LiteralPath $releasePath)) {
  $temporaryReleasePath = Join-Path $releasesPath ".$actualDigest-$([guid]::NewGuid().ToString('N')).tmp"
  try {
    New-Item -ItemType Directory -Path $temporaryReleasePath | Out-Null
    Copy-Item -Path (Join-Path $artifact '*') -Destination $temporaryReleasePath -Recurse -Force
    Move-Item -LiteralPath $temporaryReleasePath -Destination $releasePath
  } finally {
    $temporaryReleaseFullPath = [IO.Path]::GetFullPath($temporaryReleasePath)
    $releasesFullPath = [IO.Path]::GetFullPath($releasesPath).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    if ($temporaryReleaseFullPath.StartsWith($releasesFullPath, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $temporaryReleaseFullPath)) {
      Remove-Item -LiteralPath $temporaryReleaseFullPath -Recurse -Force
    }
  }
} else {
  $storedManifestPath = Join-Path $releasePath 'release-manifest.json'
  $storedManifest = Get-Content -Raw -LiteralPath $storedManifestPath | ConvertFrom-Json
  if ($storedManifest.artifactSha256 -ne $actualDigest) {
    throw 'Digest-addressed release directory contains a different artifact.'
  }
  if ((Get-FileHash -LiteralPath $storedManifestPath -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $manifestPath -Algorithm SHA256).Hash) {
    throw 'Stored immutable release manifest differs from the verified artifact.'
  }
  if (@(Get-ChildItem -LiteralPath $releasePath -Recurse -File).Count -ne $manifest.files.Count + 1) {
    throw 'Stored immutable release contains an unexpected file count.'
  }
  foreach ($file in $manifest.files) {
    $storedFilePath = Join-Path $releasePath $file.path
    if (-not (Test-Path -LiteralPath $storedFilePath -PathType Leaf) -or
        (Get-FileHash -LiteralPath $storedFilePath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $file.sha256) {
      throw "Stored immutable release failed verification for $($file.path)."
    }
  }
}

$aliasRecord = [ordered]@{
  schemaVersion = 1
  alias = $Alias
  artifactSha256 = $actualDigest
  releaseId = $manifest.releaseId
  sourceCommit = $manifest.sourceCommit
}
$aliasPath = Join-Path $aliasesPath "$Alias.json"
$temporaryAliasPath = Join-Path $aliasesPath ".$Alias-$([guid]::NewGuid().ToString('N')).tmp"
[IO.File]::WriteAllText($temporaryAliasPath, (($aliasRecord | ConvertTo-Json) + "`n"), [Text.UTF8Encoding]::new($false))
Move-Item -LiteralPath $temporaryAliasPath -Destination $aliasPath -Force

Write-Output "Alias '$Alias' now points to $($manifest.releaseId) ($actualDigest)."
