# Fix Wave 1

G3 verdict: REQUEST CHANGES on exact commit `980d4b9`.

Blocking delta:

1. Make a completed purge discoverable before the deleted request eligibility lookup and prove retry after database completion but before the external completion checkpoint.
2. Remove inbound invitation identity/token associations matched by respondent or the subject's normalized Auth email before Auth deletion, including dependent delivery rows.
3. Remove caller-asserted restore reconciliation IDs; traffic may open only from authenticated journal `restore_reconciled` progress.
4. Refuse missing-head recovery. Recovery may advance only an authenticated stale head after validating a strictly extending encrypted chain; never accept an unanchored prefix.

Rerun focused tests, migration reset/lint, the complete destructive local purge E2E, full relevant gates, territory audit, and fresh independent G3 on the new exact head.
