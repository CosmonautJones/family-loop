# Current Mission

Mission ID: `FAMILY-LOOP-OPORD-001`

Status: Complete — external Run 3 review accepted AMBER / PROCEED-WARN; runtime execution remains separately authorized per OPORD.

## Objective

Create a complete, sequential set of at least ten independently executable operations orders covering the frontend, backend, server/database, security, quality, release, and older-adult usability work needed for a simple and dependable LoopedIn app.

## Authorized manifest

- `docs/opords/**`
- `tests/spec-docs.test.js`
- `tasks/current-mission.md`
- `tasks/backlog.md`
- `tasks/completed.md`
- `docs/architecture.md`
- `evals/review-log.md`
- `evals/code-rubric.md`
- `evals/ux-rubric.md`
- `evals/regression-checklist.md`

No runtime, dependency, configuration, credential, deployment, or remote-system change was authorized.

## Deliverables and acceptance

- One campaign index and exactly 17 unique, dependency-resolvable OPORDs.
- Every OPORD contains a machine-readable `Depends on:` line and an executable task table with at least three bounded, uniquely identified tasks.
- Coverage of accessibility; navigation/design/forms; auth/users/groups; API/server; database/RLS/migrations; events/calendar/RSVP; realtime chat; private media; notifications; memories; offline/performance; security/observability; testing/native usability; and CI/release/deploy/backup/restore.
- Each order is one coherent mission with evidence, territory, usability guardrails, ordered work, measurable acceptance, local/conditional validation, stop conditions, and definition of done.
- Portable Node tests prove count, numbering, headings, dependency links, and domain coverage.
- Baseline remains truthful: M1-M3 exist; remote Supabase is unverified; Docker is unavailable; lint is a placeholder; native/human tests are not run.

## Authorization limits

Future mission documents can name files and systems but do not authorize execution. Credentials, remote mutation/deploy, destructive migration, new dependencies, push/PR/release, and production data access remain RED until separately approved.

## Completion evidence

Campaign commits: `6c612ce` (initial 15-order campaign), `0291b3f` (17 executable orders), and `fd6061d` (Run 3 authority/parser correction). The external gate found zero blockers: G1 PASS, G2 WARN for placeholder lint assigned to OPORD 015, and G3/G4/G5 PASS; overall AMBER / PROCEED-WARN.

Definition of done:

- [x] Exactly 17 OPORDs and 60 bounded tasks are indexed and parser-validated.
- [x] Dependencies resolve, are acyclic, and precede dependents in the canonical execution order.
- [x] Required engineering and older-adult usability domains are covered.
- [x] Relevant local tests, TypeScript, harness, and diff checks pass.
- [x] Independent review has zero blockers; the sole warning has a named remediation order.
- [x] Conditional evidence remains explicit rather than inferred.

No live backend, native-device, human-usability, deployment, backup, or restore proof is claimed.
