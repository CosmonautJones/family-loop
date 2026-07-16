# Authenticated encrypted user export

## Scope

The Family surface offers a read-only export for the signed-in account. A signed-in account with no family sees the same card on the family onboarding surface.

The version-1 scope is deliberately conservative: the current account profile identifier/display name, its family memberships, plans it created, and its own RSVPs, comments, uploaded photo metadata/bytes, and reminder choices. It does not copy other members, other people’s contributions, notification copies, invitation secrets, Auth tokens, signed media URLs, or an entire shared-family archive. Shared-family portability requires a separate ownership/product decision.

The browser fetches each owned photo through the already-authorized media URI and places only its bytes, media type, size, and SHA-256 in the plaintext payload. Reads stream through a 1 MiB ceiling and a 15-second abort timeout before allocation. If a photo cannot be read, its non-URL metadata remains and the manifest reports the unavailable file count; rerunning the export retries the normal authorized read. Comments are serialized through an allowlist, so nested author/avatar objects cannot carry private or signed URLs into plaintext.

## Format and verification

The downloaded `.loopedin` JSON envelope is versioned and contains only encryption metadata plus ciphertext:

- PBKDF2-SHA256, 310,000 iterations, random 16-byte salt;
- AES-256-GCM, random 12-byte IV;
- ciphertext SHA-256 for transport diagnostics;
- an encrypted manifest with record counts and a SHA-256 of the exported data.

The passphrase exists only in component memory during collection/encryption. It is cleared after a successful download and is never sent, persisted, or logged. LoopedIn cannot recover a forgotten passphrase. `decryptUserDataExport` authenticates the ciphertext and independently checks the inner data digest, record counts, scope, and creation timestamp for automation and future import tooling; no import UI is claimed.

## Local configured proof

Prerequisites: retained `family-browser-v1` local Supabase scenario and a configured static web export on `http://127.0.0.1:8090`.

```powershell
./scripts/test-local-supabase-data-export-browser.ps1 -RunMarker family-browser-v1
./scripts/verify-local-supabase-browser-scenario.ps1 -RunMarker family-browser-v1
```

The 2026-07-14 run used three isolated real Auth sessions: owner Avery, member Maya, and the outsider. Each triggered an actual Chrome download and the harness decrypted it. Personal records matched only the authenticated user; pairwise foreign user IDs were absent; the outsider bundle had only its account profile and empty memberships/contributions. Signed URL patterns were absent. Wrong passphrases and modified ciphertext were rejected.

At 390×844 the two inputs were 52px, the action was 48px, document width was 390/390, focus was visible on the first field, mismatch copy retained the passphrase for correction, and console events were zero. The proof is read-only. The canonical scenario remained exactly 4 identities, 3 members, 3 trips, 6 messages, 6 RSVPs, 3 media, 38 notifications, 0 reminders, 3 Storage objects, and zero outsider residue.

## Hosted staging proof

Release `0.1.0-a45838479634` on dedicated Netlify deploy `6a5863f6aebae3714ef3906c` ran the same export through three fresh headless-Chrome profiles against dedicated staging. The marked owner, private-photo owner, and outsider each signed in through the hosted UI and triggered an actual `.loopedin` download. The harness verified the external runtime project before sign-in and deleted every browser profile/download afterward.

All three envelopes used PBKDF2-SHA256 at 310,000 iterations and AES-256-GCM. Ciphertext and inner-data digests matched; wrong passphrases and modified ciphertext failed. Record counts matched current-user contributions, pairwise foreign synthetic user IDs and email/token/URL patterns were absent, the outsider contribution collections were empty, and the photo owner's one embedded PNG matched the uploaded bytes by SHA-256. The 390×844 export controls measured 52/48px with no horizontal overflow; console warnings/errors and failed requests were zero.

The superseding enclosing family drill `qa-mrniaqp3-c0cb2cea` also passed exact per-account contribution counts across all four synthetic identities, three members, three events, three RSVPs, two comments, seven notifications, Realtime observation, private-media deletion, unchanged non-QA state, and zero Auth/profile/group/invitation/object residue. This is automated synthetic staging proof, not a real-family export observation.

## Limits

There is no server-side export job/audit ledger, shared-family archive export, production retention approval, physical phone/assistive-technology evidence, or permanent account purge. Hosted evidence uses disposable synthetic accounts; real Travis export and physical-device observation remain unproven. Destructive deletion remains policy- and authorization-gated.
