$required = @(
    "AGENTS.md",
    "CLAUDE.md",
    "docs/vision.md",
    "docs/core-loop.md",
    "docs/taste-bar.md",
    "docs/anti-goals.md",
    "tasks/current-mission.md",
    "evals/product-rubric.md",
    "evals/ux-rubric.md",
    "evals/code-rubric.md",
    "evals/regression-checklist.md"
)

$missing = @()

foreach ($file in $required) {
    if (!(Test-Path $file)) {
        $missing += $file
    }
}

if ($missing.Count -gt 0) {
    Write-Host "Missing required harness files:"
    $missing | ForEach-Object { Write-Host "- $_" }
    exit 1
}

Write-Host "AI Builder Harness looks good."
