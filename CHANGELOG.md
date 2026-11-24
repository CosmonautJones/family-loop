# Changelog

## 0.1.0 — Release candidate

LoopedIn's first versioned release targets small families using the existing
responsive web app at https://loopedin-family.netlify.app.

- Create an account, confirm email, create a family, and invite relatives.
- Plan events, RSVP, discuss logistics, share private photos, and revisit memories.
- Recover account access and export encrypted account contributions.
- Keep ongoing events visible on Home, with a Happening now label.
- Highlight Calendar dates only in the displayed month and year.
- Refresh compatible transitive dependencies to clear the high/critical audit gate.
- Add eight repeatable local family simulations covering persistence, concurrent
  updates, response-loss retries, authorization, event dates, and cleanup.

Release verification and operational limitations are recorded in `GO-LIVE.md`.
Local simulations do not establish hosted email delivery, physical-phone
accessibility, or a current recoverable backup. Permanent account purge remains
operator-only and is not enabled by this release.
