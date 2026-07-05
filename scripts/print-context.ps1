$files = @(
    "docs/vision.md",
    "docs/core-loop.md",
    "docs/taste-bar.md",
    "docs/anti-goals.md",
    "tasks/current-mission.md"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host ""
        Write-Host "===== $file ====="
        Get-Content $file
    }
}
