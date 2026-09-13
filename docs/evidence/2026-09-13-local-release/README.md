# Authorized local staging release — 2026-09-13

**Update: deployed successfully.** See [published release and hosted retest](published-retest.md). The preparation record below preserves the earlier blockers as historical evidence.

The owner explicitly approved establishing a documented local build-and-verification release path after GitHub runner allocation failed. This evidence supersedes the earlier CI-only blocker for this frontend-only staging candidate. It does not claim hosted deployment or successful hosted CI.

- Exact source: `c6c0de82de926a173102d4cdab13202cac70905c` (PR #19).
- Release: `0.1.0-c6c0de82de92`.
- Artifact SHA-256: `d123f97d3cbfffedaaf4c4605a3d520dcb32ba9d2b976bfefcc3a5296f186b17`.
- Publish ZIP: `loopedin-staging-c6c0de82de92.zip`, 593,679 bytes, SHA-256 `3a36f018ff90ad9f7e9a1e10b71ddbce10ff594bb0d3158495e1899a2a408ce3`.
- Target: Netlify `loopedin-family`, ID `50ae6d6b-28ad-49c0-9654-c3a54899fcb5`, alias `https://loopedin-family.netlify.app`.
- Runtime was fetched read-only from that alias and verified as `loopedin-staging`, Supabase `https://vkogznsfthirhxkqysza.supabase.co`. Public configuration is preserved in the package; no privileged credential is included.
- Existing rollback target: immutable Netlify deploy `6aa2a671aa89755f10dca32c`, observed ready and published September 10. Netlify calls this published alias context `production`; the application runtime identifies staging. This distinction is not permission to deploy to any other target.

## Verification

The complete local Git tree matched the remote tree `dbc02de4bdfe786b82357484f01fcd3e86b80b36`. The unsigned Git commit object was reconstructed from provider metadata and accepted only when its Git object hash exactly matched the source SHA. It was marked as a shallow boundary because parent objects were not downloaded. No synthetic local commit identity was used in the release manifest.

The existing, unchanged `scripts/build-web-release.ps1` built from `git archive` of that exact commit, performed a fresh locked dependency install, applied the existing Metro compatibility shim, and exported runtime-configured web assets. PowerShell 7.6.2 was extracted from Microsoft's Ubuntu package after verifying the package-index SHA-256. Node v24.19.0/npm 11.9.0 were used, differing from CI Node 22.

| Gate | Result | Evidence |
| --- | --- | --- |
| Root suite including eight family simulations | 177/177 PASS | [tests.txt](tests.txt) |
| App ESLint | PASS | [lint.txt](lint.txt) |
| TypeScript | PASS, no findings | [types.txt](types.txt) |
| Harness | PASS | [harness.txt](harness.txt) |
| Workflow lint | PASS, actionlint 1.7.12 | [workflows.txt](workflows.txt) |
| Dependency audit at high-severity threshold | PASS; 11 moderate findings remain | [audit.txt](audit.txt) |
| Secret scan | PASS, 317 tracked files | Observed command exit 0 |
| Migration checksum/order validation | PASS, 10 migrations | Observed command exit 0 |
| Exact-source release build | PASS | [build.txt](build.txt), [manifest](release-manifest.json) |
| Deployment-envelope build and verification | PASS against the recorded source/digest | Existing repository verifiers exited 0 |

Workflow lint initially hit a container archive-ownership restriction. Rerunning the unchanged script with `TAR_OPTIONS=--no-same-owner` passed. No workflow source or application dependency was altered. The artifact builder ran unmodified. Logs retain results with trailing whitespace removed.

## Boundaries and transport

Docker/local Supabase apply-and-lint, physical devices, authenticated browser flows, and a hosted retest of this candidate were not performed. No backend/schema change is in this candidate. Moderate audit findings are recorded rather than silently force-upgrading Expo.

Automatic approval review initially rejected the deploy action because of Netlify's production-context label. A read-only runtime check established the exact staging target; a subsequent tool request was accepted and returned a source-upload/build command. That command was not executed because it would use Netlify's build system instead of the repository's required direct promotion of verified bytes. No deployment or merge is claimed by this evidence.

`npx -y netlify-cli status` returned “Not logged in.” The connected plugin did not provide a preauthenticated direct-upload CLI session. This is the remaining transport blocker, separate from deployment authorization.

The prepared ZIP contains the verified envelope at its root. Direct CLI/manual upload must publish these bytes without rebuilding, preserve the exact runtime overlay, and record the resulting deploy ID. After upload, verify the hosted manifest/file hashes and runtime/security/cache behavior, then run authenticated family scenarios when test-account access is available. The local package alone does not close those hosted gates.
