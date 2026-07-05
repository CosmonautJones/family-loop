param(
    [Parameter(Mandatory=$true)]
    [string]$Title
)

$missionPath = "tasks/current-mission.md"
$date = Get-Date -Format "yyyy-MM-dd"

@"
# Current Mission

## Mission

$Title

## Business / product reason

TBD

## User story

As a [specific user], I want [specific action], so that [specific value].

## Acceptance criteria

- [ ] TBD
- [ ] TBD
- [ ] TBD

## Files or modules likely involved

- TBD

## Required checks

- [ ] TBD
- [ ] TBD

## Do not touch

- TBD

## Risks

- TBD

## Definition of done

- [ ] Acceptance criteria met
- [ ] Relevant checks run
- [ ] Review log updated
- [ ] Follow-up tasks listed
"@ | Set-Content -Path $missionPath -Encoding UTF8

Write-Host "Created new mission: $Title"
Write-Host "Edit $missionPath before asking an agent to build."
