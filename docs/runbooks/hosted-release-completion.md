# Hosted release completion

Audit date: 2026-07-14

Branch inspected: `codex/family-loop-release-candidate`

Mode: read-only provider and repository audit; no project, deployment, migration, setting, credential, DNS record, user, database row, or Storage object was created or changed.

## Truth boundary

This runbook is the handoff from the proven local release candidate to hosted staging and, only after a separate approval, production. Historical local and hosted-CI evidence remains valid. A plan, provider login, linked project, or available feature is not deployment evidence.

### Proven now

- Draft PR #1 is open and mergeable in `CosmonautJones/family-loop`. GitHub Actions run `29376550310` passed `Application quality`, `Security and dependencies`, and `Migration integrity` on exact commit `3ca1db3c2d3446efc0e3301460dd0231a0ab18cd`.
- CI uses read-only repository permission, immutable action commits, bounded jobs, a deterministic app lockfile, secret/dependency checks, migration history/checksum checks, and a disposable loopback Supabase apply/lint.
- The environment-neutral web artifact, external `runtime-config.json`, fail-closed bootstrap, derived backend CSP, cache policy, SPA fallback, promotion, and rollback contracts pass locally. The cross-browser remediation is committed at `31c74466e6faba2e9824cc5c7046c2fbfad5c269`; its exact three-file artifact `0.1.0-31c74466e6fa` has SHA-256 `a8c41774b3cb4bbedc8cc53eb14af95a3f23227d9627e9778df58b568c0ef740` and passed Edge/Firefox locally. A new exact-head hosted CI run is still required after the evidence documentation is committed and pushed.
- Local Supabase proves Auth, Postgres/RLS, private Storage, Realtime, recovery mail through local Inbucket, multiple users, and backup/isolated restore. These remain local results.
- Netlify is the selected frontend host. The existing personal-site project `travisjohnjones` is explicitly out of scope and must not be linked, relinked, renamed, or deployed over; no dedicated LoopedIn site has been identified or created.
- Supabase CLI is authenticated. The linked hosted project is healthy but is **quarantined**: its remote migration history is unrelated (`001`-style and older 2026 migrations), while all five LoopedIn migrations are absent. It must not receive a push, repair, reset, seed, or test account.
- The linked project reports WAL-G enabled, PITR disabled, and no listed physical backups. This says nothing about a future dedicated LoopedIn project.

### Unproven now

- No hosted LoopedIn frontend, dedicated staging/production Supabase project, domain, TLS route, runtime overlay, hosted migration, Auth redirect allowlist, custom SMTP, telemetry destination, alert, hosted backup schedule, private-object backup, or hosted restore proof exists.
- No Netlify site link or deploy job exists. CI run `29382987732` built and uploaded the exact-head artifact for `9ef55479fb4089e6b610a9b06948399b5ca59362`; a target-neutral Netlify publish-envelope builder/verifier exists locally. Every provider deployment remains unproven until separately authorized and observed.
- GitHub required-check protection cannot be enabled for this private repository on its current plan; the API returns the provider's GitHub Pro/public-repository requirement.
- The ignored `app/.env.local` exists and was not read. Only the public names in `app/.env.example` were inspected: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- No production SMTP or telemetry variable names, vendor configuration, or scheduled hosted backup definition exists in the repository.

## Hosted release ledger

| Domain | Current proof | Exact next action | Acceptance evidence | Stop condition | User/provider decision? |
|---|---|---|---|---|---|
| Deployment | Exact-commit artifact/runtime-overlay/promotion/rollback pass locally; no dedicated LoopedIn Netlify site | After the tree is clean and green, create a new dedicated `family-loop-staging` site without touching `travisjohnjones`; compose the successful-CI artifact with a reviewed staging `runtime-config.json`, `_headers`, and `_redirects`; upload the verified publish directory without rebuilding | Deployment URL, Git SHA, artifact digest, overlay/policy digests and environment ID, TLS, headers/CSP/cache/hash-route reload and missing-asset 404 checks, 320/390/430/1280 and Edge/Firefox/phone smoke, configured core loop, and rollback to the prior deploy all pass | Dirty/unreviewed tree; digest mismatch; config/artifact mismatch; missing TLS/security headers; backend incompatibility; accidental personal-site or Production target | **Yes:** Netlify team, new staging site name/domain, and authorization to create/deploy. Production remains a later manual approval |
| CI | Run `29382987732` passed all four jobs on `9ef55479fb4089e6b610a9b06948399b5ca59362`; its downloaded artifact independently matched the trusted commit and digest with no secrets/remotes | Keep exact-head artifact production green; separately authorize temporary seeded-failure PRs for each blocking class and remove seeds | Green clean run; downloaded bytes verify to the job SHA/digest; lint/test/secret/migration seeds each fail for the intended reason; no secrets or remote DB access in PR jobs | Job gains write permission unnecessarily; secrets reach PR jobs; remote migration occurs; uploaded bytes mismatch; deployed bytes are rebuilt instead of promoted | **Yes:** GitHub Pro or public repo for enforced required checks; otherwise explicitly accept manual merge control |
| Supabase | Full loopback contracts pass; linked hosted target is demonstrably unrelated and quarantined | Inventory the newly designated dedicated project read-only, then record owner/region/plan; link only in an isolated operator checkout after approval; apply five forward migrations; configure exact Netlify staging origins/redirects; run synthetic owner/member/outsider family/media/reminder/realtime/recovery matrix; clean synthetic state | Project ref/environment inventory, pre/post migration list, DB lint, exact schema checks, RLS/Storage attack matrix, Realtime convergence, Auth redirect result, cleanup counts, and app smoke are retained without secret values | Any non-empty/unrelated migration history, ambiguous project identity, production/real-user data, destructive reset/repair, exposed credentials, RLS/private-media failure, or incomplete cleanup | **Yes:** project identity, organization, region, plan/spend, named owner, and remote mutation window |
| Mail | Local recovery/invite mail and anti-enumeration pass through Inbucket; no production SMTP | Choose a transactional SMTP provider; verify sender domain; store credentials only in Supabase; configure staging Auth URLs/templates/rate limits; test invite, confirmation if enabled, known/unknown recovery parity, expiry/replay, bounce/failure visibility | SPF/DKIM and preferably DMARC status, redacted Supabase config record, delivered staging messages to approved test mailboxes, equal public recovery responses, working callback/password replacement, Auth-log handoff, and cleanup | Default Supabase SMTP used as production proof; sender domain unverified; secrets printed/committed; callback origin differs; enumeration; real-user blast | **Yes:** provider/account, sending domain/from address, DNS authority, budget, retention, and approved test recipients |
| Backup | Encrypted local DB+private-object package and isolated restore pass; hosted target has no applicable proof | Approve RPO/RTO/retention; enable plan-appropriate hosted DB backups/PITR on dedicated staging/production; add an encrypted off-project private-Storage object copy because Supabase DB backups exclude object bytes; restore DB and objects into a disposable isolated project | Provider backup/PITR metadata, scheduled object manifest with hashes, least-privilege access record, timestamped restore point, restored counts/references/object hashes, member/outsider RLS, configured core-loop smoke, measured RPO/RTO, and approved cleanup | No isolated restore target; database-only plan presented as media recovery; cross-project key exposure; RPO/RTO miss; integrity/RLS mismatch; production restore or deletion without a new gate | **Yes:** Pro/PITR spend, proposed MVP targets (recommend 24h RPO/4h RTO), retention, off-project object store, encryption/key owner, and restore-project budget |
| Telemetry | Redacted error boundary/tests and local incident tabletop pass; Netlify/Supabase built-in observability is unused for LoopedIn | Start with available Netlify request/deploy observability plus Supabase Reports/Logs and an external synthetic sign-in/core-loop check; define privacy-safe alerts and named incident owner. Add client error reporting only after a separate SDK/vendor/privacy decision | A controlled staging frontend failure, backend outage, Auth failure, RLS denial, and synthetic-check failure appear in the chosen consoles and page the owner; no message/photo/token/signed URL is captured; retention and alert test are recorded | PII/content/token collection; no named responder; alert cannot be triggered and cleared; production log inspection without authority; new client SDK/vendor before approval | **Yes:** incident owner/on-call route, retention, alert destination, synthetic monitor, and whether to authorize a client telemetry dependency. Supabase log drains require an eligible paid plan/add-on |

## Can Netlify static hosting preserve the runtime-config and CSP contract?

**Yes, without a Netlify Function or a new application backend, if each deployment is assembled as a publish envelope rather than rebuilt from source.** Netlify consumes `_headers` and `_redirects` from the publish directory. The deploy envelope can contain:

1. the already-built, digest-verified Expo static artifact;
2. one reviewed public `runtime-config.json`, outside the artifact digest and served with `Cache-Control: no-store`;
3. generated-and-reviewed `_headers` with the exact validated Supabase origin plus exact manifest-file cache rules, and `_redirects` with no catch-all because LoopedIn deep links are fragment routes.

No secret belongs in the runtime overlay; the Supabase publishable key is public client configuration. Envelope build and verification require the trusted artifact digest and source commit from the successful CI job/run, not the downloaded manifest alone. `connect-src` is exact to the validated backend plus WebSocket origin; `img-src` intentionally retains `https:` for attributed user media. Promotion means uploading or assigning the verified Netlify deploy, not asking Netlify to rebuild different bytes.

Before upload, verify a fresh approved Netlify site is dedicated to LoopedIn, has no build command for this promotion, and receives the envelope directory directly as its publish directory. Stop if provider settings would rebuild it, if deployment resources contain Functions/Edge Functions, or if the target is `travisjohnjones`.

Pure static hosting cannot change `runtime-config.json` or CSP independently inside an existing immutable deployment. A configuration change therefore creates a new release envelope/deployment, even when the app artifact digest is unchanged. That is the intended auditable behavior and does not require inventing a backend.

Provider references:

- Netlify custom headers: <https://docs.netlify.com/manage/routing/headers/>
- Netlify redirects, rewrites, and shadowing: <https://docs.netlify.com/manage/routing/redirects/overview/> and <https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/>
- Netlify cache-control behavior: <https://docs.netlify.com/build/caching/caching-overview/>
- Supabase custom SMTP requirements: <https://supabase.com/docs/guides/auth/auth-smtp>
- Supabase database backup/PITR behavior and the explicit exclusion of Storage objects: <https://supabase.com/docs/guides/platform/backups>
- Supabase Reports/Logs: <https://supabase.com/docs/guides/telemetry/reports> and <https://supabase.com/docs/guides/telemetry/logs>
- Supabase log drains and plan requirements: <https://supabase.com/docs/guides/telemetry/log-drains>

## Minimum sequential completion plan

1. **Freeze a candidate.** Finish the active cross-browser fix/review loop, return to a clean tree, run the full local gate, commit, push, and require a green exact-head CI run. Record the new SHA and build digest; do not reuse historical digests for new source.
2. **Approve the inventory.** Name staging/production owners and decide Netlify team/new LoopedIn site/domain, dedicated Supabase project/region/plan, SMTP provider/domain, incident owner/alert destination, RPO/RTO/retention/object-backup target, and GitHub enforcement posture. This is the only unavoidable human decision gate.
3. **Create staging only.** Create a fresh LoopedIn Netlify site and approved Supabase staging resources. Do not touch `travisjohnjones`. Verify the Supabase migration history is empty/expected before applying anything. Keep the unrelated project quarantined.
4. **Certify the backend.** Apply the five migrations and run the existing synthetic multi-user/RLS/private-media/reminder/realtime/recovery suites against staging, adapted to refuse production and clean up in `finally`. Capture only identifiers, counts, digests, statuses, and timestamps.
5. **Certify mail and telemetry.** Configure custom SMTP and exact redirect URLs. Wire provider-native telemetry/synthetic monitoring first, trigger controlled failures, prove alert receipt and safe payloads, and record incident ownership/retention.
6. **Deploy the static envelope.** Promote the exact CI artifact with staging overlay/CSP, verify TLS/headers/cache/hash-route reload/missing-asset 404/runtime identity and the full configured browser loop, then rehearse Netlify deploy rollback without database rollback.
7. **Prove recovery.** Verify DB backup/PITR metadata and off-project Storage-object copies; restore both into a disposable isolated project and rerun integrity/RLS/core-loop checks within approved RPO/RTO. Delete the disposable restore target only under its approved cleanup gate.
8. **Production gate.** Present the complete staging evidence, residual physical-device/human gaps, exact deployment/backend versions, rollback point, and costs. Production resources, DNS/alias promotion, real-user mail, restore, deletion, or retention apply require a separate named approval.

## Recommended MVP decisions

These defaults are intentionally modest and must be accepted rather than silently assumed:

- one dedicated staging Supabase project and one later production project; never reuse the quarantined linked project;
- Netlify static publish envelope, no Netlify Function or Edge Function;
- custom transactional SMTP through Supabase Auth, using a dedicated subdomain and `no-reply` sender;
- 24-hour RPO, 4-hour RTO, and 30-day encrypted off-project object-backup retention for initial family use, revisited before material usage;
- Netlify + Supabase native observability and one synthetic check first; no session replay and no message/photo contents in telemetry;
- GitHub Pro required checks if the repository stays private; otherwise manual owner-enforced merge control is an explicit release warning, not a technical pass.

## Credential and evidence rules

- Never print, commit, paste into PRs, or retain service-role keys, SMTP passwords, database passwords, provider tokens, signed URLs, recovery fragments, or `.env.local` contents.
- Public runtime configuration may contain only environment ID, `supabase` mode, HTTPS project URL, and publishable/anonymous key; it still receives change review and `no-store` delivery.
- Provider screenshots are supplementary. Machine-readable SHA/digest/status/count/timestamp evidence is authoritative and must name the environment.
- Preserve every historical result. Append a superseding result when the exact SHA, environment, provider setting, or test changes; never rewrite local proof as hosted proof.
