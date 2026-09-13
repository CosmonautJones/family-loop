# Deployment attempt and retest — 2026-09-13

The owner authorized deploying the fixes and retesting. Application candidate: `2f054e06c576a1604c089e89c624444ab298c879`, PR #19. Intended target remains the dedicated LoopedIn staging Netlify site, not the personal site or a production/custom-domain environment.

## Fresh evidence

- `npm run test:simulation` passed all eight cases again: 8 passed, 0 failed, 10,978.028816 ms. Application code was unchanged from the candidate.
- GitHub CI run [34759622157](https://github.com/CosmonautJones/family-loop/actions/runs/34759622157) completed with failure. Migration integrity (103730011617), Security and dependencies (103730011769), and Application quality (103730011800) have empty runner names and no executed steps. Release artifact (103730020246) was skipped. The artifacts endpoint returned `total_count: 0`.
- This proves CI did not execute candidate checks or create its release artifact. It does not establish the account restriction's billing/quota root cause.
- The Netlify integration is available but was not installed/connected in this session. Connection was requested; no provider credentials or deployment access were available.
- The public availability checker completed PASS at `2026-09-13T13:24:51.341Z`: shell/runtime/Auth HTTP 200 and missing-asset HTTP 404. It identified existing staging release `0.1.0-c82b33411c7d`, not the new candidate. Shell took 12,007 ms and Auth 14,236 ms in this environment; this is one observation, not a performance benchmark. No authenticated journey was exercised.

## Outcome and next gate

No merge, deployment, remote database mutation, or authenticated hosted test was performed. The existing release runbook requires successful exact-source CI output and digest verification of its downloaded artifact before Netlify upload. A local simulation or ordinary web export does not satisfy that release gate.

Next: connect Netlify; restore hosted runner access and obtain the exact-candidate verified release artifact (or explicitly agree a separately reviewed local release process). Then upload the unchanged verified envelope to the dedicated staging site, verify release identity/cache/runtime/security checks, and perform authenticated family-flow retests with approved test-account access. Deployment authorization is already given; the remaining blockers are access and release evidence, not a repeated permission request.
