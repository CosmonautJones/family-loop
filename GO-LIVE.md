# GO-LIVE — LoopedIn (family use)

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
