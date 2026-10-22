# Changelog

All notable changes to LoopedIn (family-loop) are recorded here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-10-21

First versioned release, matching the app at
[loopedin-family.netlify.app](https://loopedin-family.netlify.app). The root
`package.json`, `app/package.json` and `app/app.json` already said
`0.1.0`, so this release tags the current state of `main` (through
2026-09-17).

### Added
- Family Loop concept, prototype, brand package and landing page, then an Expo
  (React Native) app: the MVP screens and navigation, real event creation, a
  shared calendar, and typed feature modules.
- The LoopedIn rebrand with a photo-first visual system, a mock service layer
  with persistent app state, and the mobile backlog slices.
- Supabase backend wiring, a session boundary with gated app sessions,
  query-owned event data, event threads with a composer, and the durable Jones
  Family data mode.
- The release candidate ([#1](https://github.com/CosmonautJones/family-loop/pull/1)): privacy-safe hosted error telemetry
  ([#3](https://github.com/CosmonautJones/family-loop/pull/3)), waiting for Postgres Realtime to be ready ([#4](https://github.com/CosmonautJones/family-loop/pull/4)), a recoverable
  account-deletion grace period ([#6](https://github.com/CosmonautJones/family-loop/pull/6)), and a retryable permanent account
  purge ([#15](https://github.com/CosmonautJones/family-loop/pull/15)).
- Invitations: a secure invitation email sender ([#11](https://github.com/CosmonautJones/family-loop/pull/11)) and proofs that
  hosted copied invitation links and the invitation backend work
  ([#10](https://github.com/CosmonautJones/family-loop/pull/10), [#12](https://github.com/CosmonautJones/family-loop/pull/12)).
- Verified public family onboarding with a dedicated email-confirmation
  screen.
- CI: workflow linting shared between local runs and CI, hourly monitoring
  combined into one job, and invitation release verification guarded by
  tests.

### Changed
- The UI is redesigned to the porcelain system on every screen, with a tab-bar
  fix ([#16](https://github.com/CosmonautJones/family-loop/pull/16)). The icon font is removed so the deploy fits its size limit
  ([#17](https://github.com/CosmonautJones/family-loop/pull/17)).
- Scheduled staging operations are paused during prelaunch development.

### Fixed
- The hosted backup operation fingerprint ([#2](https://github.com/CosmonautJones/family-loop/pull/2)) and signup from a copied
  hosted invitation ([#9](https://github.com/CosmonautJones/family-loop/pull/9)).
- Invite edge cases: the account switch only shows on a mismatch, the invite
  is revalidated before switching, signup outcomes are clearer, and handoff
  guidance is preserved.
- Selected photo bytes are read without a fetch that CSP was blocking.
- Restored audited Expo release bundling and the high-severity audit gate.
  Refreshed release dependencies and fixed the Windows migration checkout.
- Durable local revisions are serialized, and the mock event loop is
  deterministic and sorted by time.

### Documentation
- Hosted staging, lifecycle and export, and operations evidence
  ([#5](https://github.com/CosmonautJones/family-loop/pull/5), [#8](https://github.com/CosmonautJones/family-loop/pull/8), [#13](https://github.com/CosmonautJones/family-loop/pull/13), [#14](https://github.com/CosmonautJones/family-loop/pull/14)), the product README with visuals and an engineering guide,
  and clone instructions for the public repository.

[Unreleased]: https://github.com/CosmonautJones/family-loop/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/CosmonautJones/family-loop/releases/tag/v0.1.0
