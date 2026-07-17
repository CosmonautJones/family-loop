# Phase A — Briefing

BLUF: Reconcile current hosted operational evidence into the repository, including the fresh post-rotation backup/restore proof, without changing application behavior or any provider. Merge only after scoped checks, fresh independent review, and exact-head CI are green.

Success: Current mission, OPORD, runbook, regression, and review records consistently distinguish completed staging evidence from remaining Gmail, production, lifecycle-purge, PITR, domain, and device gates. The documentation-only branch passes secret/diff checks, independent review, CI, territory audit, and exact-tree verification after merge.

Scope: Documentation paths explicitly assigned in the OPORD; read-only GitHub run and repository evidence; mission artifacts under this directory.

No-go zones: quarantined Supabase project; provider mutation; production provisioning; recipient contact; secrets or invitation/recovery URLs; application/schema/workflow behavior; personal Netlify site; `runs/` in source control.

Authority: Existing user approval covers repository documentation and read-only provider evidence. Gmail authentication, production organization/region/plan/billing choices, DNS, recipients, physical devices, and irreversible production decisions remain human gates.

Profile and budget: Critical because the evidence concerns credentials, backups, hosted operations, release, and a quarantined resource. One documentation execution wave plus one bounded fix wave; no model or cost claim without runtime verification.

Evidence baseline: staging deploy and rollback already proven; nine migrations match; invitation provider delivery and copied-link acceptance are proven; fresh GitHub backup/isolated restore run `29527751546` is green after password rotation. Gmail inbox observation, dedicated production, permanent purge, managed PITR, custom domain, and physical-device evidence remain unproven.
