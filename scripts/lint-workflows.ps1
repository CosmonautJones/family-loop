#requires -Version 7.0
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$version = '1.7.12'
$architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
if ($architecture -ne 'X64') { throw 'This launcher currently supports x64 Windows and Linux.' }
if ($IsWindows) {
  $asset = "actionlint_${version}_windows_amd64.zip"
  $digest = '6e7241b51e6817ea6a047693d8e6fed13b31819c9a0dd6c5a726e1592d22f6e9'
  $binary = 'actionlint.exe'
} elseif ($IsLinux) {
  $asset = "actionlint_${version}_linux_amd64.tar.gz"
  $digest = '8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8'
  $binary = 'actionlint'
} else {
  throw 'This launcher currently supports x64 Windows and Linux.'
}

$cache = Join-Path $repoRoot ".cache/actionlint/$version"
New-Item -ItemType Directory -Path $cache -Force | Out-Null
$archive = Join-Path $cache $asset
if (!(Test-Path -LiteralPath $archive)) {
  $download = "$archive.$([guid]::NewGuid().ToString('N')).download"
  try {
    Invoke-WebRequest "https://github.com/rhysd/actionlint/releases/download/v$version/$asset" -OutFile $download -TimeoutSec 60
    if ((Get-FileHash -LiteralPath $download -Algorithm SHA256).Hash.ToLowerInvariant() -ne $digest) {
      throw 'actionlint download checksum mismatch.'
    }
    Move-Item -LiteralPath $download -Destination $archive -Force
  } finally {
    if (Test-Path -LiteralPath $download) { Remove-Item -LiteralPath $download }
  }
}
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $digest) {
  throw 'Cached actionlint archive checksum mismatch. Remove the named archive and retry.'
}
# Restore the executable from the verified archive, including on offline runs.
if ($IsWindows) {
  Expand-Archive -LiteralPath $archive -DestinationPath $cache -Force
} else {
  tar -xzf $archive -C $cache $binary
  if ($LASTEXITCODE -ne 0) { throw 'Could not extract actionlint.' }
}
Push-Location $repoRoot
try {
  & (Join-Path $cache $binary) -color
  $lintExit = $LASTEXITCODE
  if ($lintExit -eq 0) { Write-Host "GitHub workflow lint passed (actionlint $version)." }
} finally {
  Pop-Location
}
exit $lintExit
