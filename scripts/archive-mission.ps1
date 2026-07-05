$missionPath = "tasks/current-mission.md"
$completedPath = "tasks/completed.md"
$date = Get-Date -Format "yyyy-MM-dd"

if (!(Test-Path $missionPath)) {
    Write-Error "No current mission found."
    exit 1
}

$title = Select-String -Path $missionPath -Pattern "^## Mission" -Context 0,2 |
    ForEach-Object { $_.Context.PostContext[1] }

if ([string]::IsNullOrWhiteSpace($title)) {
    $title = "Untitled mission"
}

$content = Get-Content $missionPath -Raw

@"

---

## $date - $title

$content
"@ | Add-Content -Path $completedPath -Encoding UTF8

Write-Host "Archived mission to $completedPath"
Write-Host "Now create a new mission with scripts/new-mission.ps1"
