# LoopedIn documentation

Start with the current product and engineering references. Older planning documents remain available as design history; their proposals and dated checks are not claims about today's release.

## Current references

| Document | Purpose |
| --- | --- |
| [Run locally](../GETTING_STARTED.md) | Demo mode, checks, Supabase integration, and troubleshooting. |
| [Vision](vision.md) and [core loop](core-loop.md) | Who the product is for and how an event connects its features. |
| [Architecture](architecture.md) | State, service boundaries, authentication, and data ownership. |
| [Release status](../GO-LIVE.md) | Current deployment checkpoint and open acceptance work. |
| [Verification log](../evals/review-log.md) | Dated implementation and release evidence. |
| [Public family onboarding](runbooks/public-family-onboarding.md) | Signup, email verification, family creation, and invitation boundaries. |
| [Release and rollback](runbooks/web-release-and-rollback.md) | Source identity, artifacts, runtime configuration, and deployment recovery. |
| [Backup and monitoring](runbooks/hosted-operations-backup-monitoring.md) | Operational design and historical checks; consult the release status for current coverage. |
| [Visual assets](assets/README.md) | Image provenance, screenshot fixtures, and reuse notes. |

## Design and execution history

The numbered `01` through `10` documents preserve early product research, proposals, visual direction, prototypes, and branding. Some concepts were reduced or deferred during implementation. Use the current code, architecture, and dated release evidence when assessing implemented behavior.

- [Executive summary](01-executive-summary.md)
- [Product research](02-market-research.md)
- [Original proposal](03-product-proposal.md)
- [Historical roadmap](04-spec-roadmap.md)
- [Visual direction](05-visual-direction.md)
- [Wireframe](06-wireframe.html) and [prototype](07-product-prototype.html)
- [Brand package](08-brand-package.md) and [landing concept](09-landing-page.html)
- [Original workflow proposal](10-loop-architecture-and-workflow.md)
- [Engineering operations orders](opords/README.md)

The `project-profiles/` and `prompts/` directories are retained development-harness references, not steps required to run LoopedIn.
