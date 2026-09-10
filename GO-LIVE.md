# GO-LIVE — LoopedIn (family use)

## Current finish checkpoint: 2026-09-10

This checkpoint supersedes the dated status and unconditional readiness claims below. The target remains a small private family launch using the existing product.

- Canonical GitHub repository: `https://github.com/CosmonautJones/family-loop` (private).
- Latest saved candidate at discovery: `codex/invitation-flow-release-ready`, source `eb587668eac3d2ea6d21ff015df0c4ed52c9ea52`, dated August 26. It contains all of current `main` plus 14 commits. The clean release checkout and the latest verification checkout agree.
- Application and local lint tooling are integrated into `main` through `d104de89c0e8aefd6e9b8958917775eba32cadd5`. Live site: `https://loopedin-family.netlify.app`, release `0.1.0-c82b33411c7d`, environment `loopedin-staging`. Netlify deploy `6aa2a671aa89755f10dca32c` was published September 10 through the authenticated existing-project upload UI.
- Fresh read-only availability passed shell/runtime/Auth HTTP 200, security/cache headers, release identity, and missing-asset HTTP 404. The hosted signed-out browser reaches the sign-in form. This does not prove a signed-in family journey or the newer candidate's deployment.
- GitHub Actions is blocked before jobs start. Availability run `34425708109` and backup run `34337308359` both report failed account payments or a spending limit. The latest observed successful backup run is `34212218896` from September 8. This is workflow status, not a fresh download/restore proof.
- An HTTP health check is not a guarantee against provider suspension or data loss. Scheduled checks and backups cannot be counted as safeguards while Actions cannot run. No billing settings have been changed.
- The finish branch `codex/loopedin-finish-20260910` preserves the candidate and pins migration SQL/checksum files to LF. It updates existing transitive xmldom, browserslist, and js-yaml packages within compatible ranges. Fresh lockfile audit reports zero high/critical findings and 11 moderate findings; the latter are not represented as resolved.
- Travis deferred GitHub Actions in favor of local verification on September 10. `npm run lint` passes workflow validation and app ESLint locally; the final repository suite passes 169/169 and all ten migration checks pass. Prior app 91/91, TypeScript, exact build, and local browser evidence apply to unchanged app/database inputs. Hosted CI is unavailable, not green.
- The verified application artifact is source `c82b33411c7d3effa2faef7a55c9bb646e798d4d`, SHA-256 `c7308f4c52f68d07fe8f3de06c86354e1e5a36a984162595d34544db4215700e`. Its app, database, and build script match the integrated code. A Netlify deployment envelope using the current public staging runtime was built and independently verified locally. Packaging is not deployment proof.
- After publication, read-only verification matched the root HTML, full manifest, runtime identity/cache policy, and all 11 application payloads to that artifact. Availability passes shell/runtime/Auth 200, expected release/security headers, and missing-asset 404. Browser sign-in and recovery entry render; a synthetic nonexistent invitation is refused across reload. No app-origin browser errors were captured. These checks do not prove authenticated family use or real invitation/signup delivery.
- Previous immutable deploy `6a5a3b8a7680daa8bfdd67bf` remains listed as completed and is the recorded rollback target. No rollback was executed, no database was changed, and no email was sent during this deployment.

### Remaining launch sequence

1. Use local verification while Actions is deferred. The account cap still prevents scheduled monitoring/backups; restoring those jobs or replacing their operational coverage remains separate unfinished work. Do not treat local linting as backup or restore evidence.
2. Integration, publication to the existing site, and deployed-byte verification are complete. Retain the prior immutable deployment for rollback; a rollback rehearsal for this new pair has not been performed.
3. Use one user-approved recipient/inbox to prove invitation receipt, confirmation-required signup, return to the invitation, acceptance, reload, wrong-account recovery, and consumed/revoked/expired denial. The hosted invitation harness now requires the chosen artifact's full source and digest and checks every deployed payload before privileged access. It is prepared for synthetic existing-account and denial checks, but its updated hosted scenarios remain NOT RUN and it does not prove new-account mail confirmation. See `docs/runbooks/hosted-invitations-and-email.md`.
4. Have the owner privately complete password recovery and check the core event loop on an actual phone: create a plan, RSVP, comment, add a photo, reload, and revisit it. Physical-device and assistive-technology checks remain unproven.

Local tests and builds can continue without Actions. Local Docker Supabase integration was unavailable at discovery because the Docker engine was stopped. No hosted data, recipients, passwords, deployment, or billing state was changed by this checkpoint.

## Historical July handoff

The text below is retained for its original decisions and triage context. Statements such as "CI is green", "Nothing below requires more engineering", and the asserted keep-alive guarantee are historical and are superseded by the checkpoint above.

_Last verified: 2026-07-16 by live checks against the Netlify site, the Supabase
project (`vkogznsfthirhxkqysza`), and the repo. This is the single actionable
handoff doc — the `docs/runbooks/*` files are the detailed evidence behind it._

## TL;DR

**It is already a live, working, deployed app.** Verified today:

- Frontend live at **https://loopedin-family.netlify.app** — loads, renders the
  sign-in screen, and the in-app banner reads **"loopedin-staging · Connected"**
  (it is talking to the real backend).
- Backend Supabase project **LoopedIn** (`vkogznsfthirhxkqysza`, us-east-2) is
  **ACTIVE_HEALTHY**, schema now at **migration 10 of 10** (brought current on
  2026-07-16 via the MCP tooling, remote migration history reconciled to the repo
  version `20260716213000` so a future `supabase db push` is a no-op). Migration
  10 is dormant `service_role`-only purge tooling — not reachable by family use.
- Email via Resend is wired; sending domain `travisjohnjones.com` is DNS-verified
  (DKIM/SPF/DMARC). Provider reports invitation + recovery mail as "delivered".
- CI on `main` is green. Code is merged (`origin/main` @ `459daa2`).

The gap between "deployed" and "my family is reliably using it" is a **short list
of things only you can do** (credentials, billing, your inbox, real people).
Nothing below requires more engineering.

---

## Data durability — chosen path: STAY ON FREE + SAFEGUARDS

You chose to stay on the Supabase **free tier** rather than upgrade to Pro. That
is a reasonable call **because the safeguards that offset the free-tier risks
already exist as scheduled GitHub Actions** — but only if those workflows are
actually enabled and their secrets are set in your GitHub repo. Verify that
(checklist step 1).

The two free-tier risks and how each is already covered:

1. **Auto-pause after ~7 days idle** (three sibling projects in this org are
   already paused). → **Covered by `.github/workflows/availability.yml`**, which
   fetches `https://vkogznsfthirhxkqysza.supabase.co/auth/v1/health` every 30
   minutes. That steady traffic is almost certainly why `LoopedIn` is still active
   while its idle siblings paused. As long as this workflow runs, the project
   won't idle-pause.
2. **No managed backups** on irreplaceable photos. → **Covered by
   `.github/workflows/encrypted-backup.yml`**, a daily client-encrypted backup of
   the database + private media that is restore-verified before upload.

**Accepted risk you're signing up for by staying on free:**

- The daily backup is stored as a **GitHub Actions artifact with 30-day
  retention** — it is *not* long-term offsite storage. If GitHub Actions is
  disabled, or you don't download an artifact within 30 days, the only copy of a
  given day's family photos can age out. **Mitigation:** periodically (say
  monthly) download one `loopedin-staging-backup-*` artifact and keep it
  somewhere durable. This is the single most important habit on the free path.
- Free-tier storage is ~1 GB; heavy photo use will eventually need Pro anyway.
- If GitHub Actions ever stops running, **both** safeguards silently lapse — the
  project can then pause and stop being backed up without warning.

_You can switch to Supabase Pro (~$25/mo) at any time to remove auto-pause and get
managed daily backups; nothing here has to be redone if you do._

---

## Go-live checklist (in order)

Each step is marked **[YOU]** (needs your hands on an account/inbox/person) or
**[CAN AUTOMATE]** (Claude can do it through the connected Supabase tooling if you
say go).

1. **[VERIFIED 2026-07-16] Safeguards are live and green.** Confirmed via `gh`:
   **Hosted availability** last 5 scheduled runs all succeeded (~every 30 min, the
   anti-pause keep-alive), and **Encrypted hosted backup** is running daily and
   green (one transient failure at 07-16 12:54 that recovered on the next run).
   GitHub Actions is enabled on `CosmonautJones/family-loop`. Ongoing owner habit:
   glance at GitHub → Actions occasionally, and download a backup artifact monthly
   for durable offsite retention (artifacts expire after 30 days).
2. **[YOU] Enable leaked-password protection.** Dashboard → Authentication →
   Policies → enable "Leaked password protection" (HaveIBeenPwned). One toggle;
   currently off. (This is the only real security item the linter flagged — the
   other warnings are the app's intended RPC-through-`SECURITY DEFINER` design.)
3. **[YOU — decide] Clear the seed/starter content?** There are **no test
   accounts** to wipe — the DB holds exactly one account, your own
   (`travisjohn.jones@gmail.com`), whose content is clearly generated starter data
   (group "Jones Fam"; demo events like "Yellowstone Family Road Trip"; template
   messages). Decide whether to (a) keep it as a friendly example for family, or
   (b) clear it for a blank slate. If (b), Claude can delete just that content and
   keep your account — say so. Do this *before* step 5 either way.
4. **[YOU] Prove real email actually lands.** Reconnect the Gmail connector, then
   from the live app: (a) trigger a password reset to your own address and confirm
   the email arrives **in the inbox, not spam**; (b) send yourself a group
   invitation and confirm the same. Provider "delivered" ≠ inbox — this is the
   real promotion blocker Codex flagged.
5. **[YOU] One real family member, end to end.** Invite exactly one person, watch
   them receive the email, sign up, and accept. If that works, the loop is proven
   for everyone.
6. **[YOU] Share the URL.** `https://loopedin-family.netlify.app` is the product.
   A custom domain (`app.travisjohnjones.com`) is optional polish, not required —
   the netlify.app URL works today.

---

## When it breaks (first-line triage)

Solo-owner apps need this more than they need prod parity:

- **"The app won't load / errors on sign-in"** → check the Supabase project isn't
  **paused** (Dashboard shows INACTIVE) — unpause it. This is the #1 likely cause
  on free tier.
- **"A family member never got the email"** → check their **spam**, then the
  **Resend dashboard** for the message status, then that their address was typed
  correctly.
- **"The site itself is down"** → check the **Netlify** deploy for `loopedin-family`.
- **"Someone's locked out"** → password reset from the sign-in screen (verify
  reset email deliverability first, step 4).

---

## Explicitly NOT needed for a ~5-person family app (don't let these block you)

Standing up a separate production Supabase project, a custom domain, managed PITR,
production purge/restore drills, load testing, and COPPA-grade data handling are
enterprise hardening. Skipping them to start is the correct call. Revisit only if
the app grows well beyond family.

---

## Known cosmetic items (safe to ignore for launch)

- The in-app environment banner literally says **"loopedin-staging"** — harmless
  label from `runtime-config.json`; relabel or hide on a future deploy.
- `favicon.ico` returns 404 (no tab icon) — cosmetic; add on a future deploy.
- Local `npm test` / `check-migrations` fail **on this Windows checkout only**,
  due to CRLF line endings (`i/lf w/crlf`). Verified: committed files are
  byte-correct and CI is green. Not a real defect. (To silence locally:
  `git config core.autocrlf input` and re-checkout, or run checks in WSL/Linux.)

---

## Appendix: advisor consult (paper trail)

A strategic advisor (fresh agent, Fable) was consulted on the go-live path.

- **Advice adopted:** (1) adopt the existing environment as production rather than
  building a separate prod stack — right-sized for a family; (2) but pay for
  Supabase Pro or accept explicit pause/backup risk (free-tier auto-pause + no
  backups are the real traps for a photo app); (3) verify email in a real inbox
  incl. spam, not just provider "delivered"; (4) wipe test data before real
  signups; (5) add the "when it breaks" triage above; (6) one consolidated doc,
  not another runbook.
- **Advice checked and corrected against ground truth:** the advisor assumed two
  migrations were unapplied; the live DB is actually at migration 9 (only the
  dormant purge migration 10 is pending, and it isn't needed for family use). The
  advisor's fear of the purge boundary firing unattended was checked against the
  SQL — the purge functions are `service_role`-only with no trigger/cron, so they
  cannot fire on their own.
