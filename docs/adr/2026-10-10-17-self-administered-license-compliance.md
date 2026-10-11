# Self-administered license compliance; paid legal review only at triggers

Date: 2026-10-10
Status: Accepted · export obligation deferred by 2026-10-11-03-soft-launch-without-email-service

## Decision

CheckMate has no legal counsel. It stays compliant by construction. The
**release compliance checklist** in `docs/wiki/open-source-reuse.md` is a
release gate: nothing is deployed publicly unless every item passes. Free help
for AGPL/GPL questions: the FSF Licensing & Compliance Lab
(licensing@fsf.org).

A paid, one-off legal review is required before any of these happens:
- charging money or showing ads
- taking investment
- publicly launching the proprietary Phase 4 AI service
- receiving a complaint or takedown request
- registering a trademark (run a "CheckMate" trademark search first; the
  name is a common word)

This refines the "legal review before commercial launch" consequence of
2026-10-10-04-license-core-agpl-3-or-later.

## Context

The user has no lawyer (2026-10-10). The MVP is an open-source, free
service. Its obligations are known and mechanical:
- **AGPL/GPL:** public source for the deployed commit.
- **CC BY-SA data:** attribution, and share-alike on the derived dataset.
- **CC BY assets:** attribution.
- **Dataset and API terms:** respected.
- **User privacy:** a plain disclosure, plus deletion and export.

Verified 2026-10-10: the FSF answers free-software licensing questions for
free. Software Freedom Conservancy has no general public Q&A.

## Alternatives rejected

- **Hire a lawyer now** — the user can't; cost isn't justified for a free,
  open-source MVP with mechanical obligations.
- **Block the build until reviewed** — stalls the project on a question
  that only matters once money or a proprietary service is involved.
- **Ignore licensing until later** — retrofitting attribution, source
  offers and share-alike dumps is costlier than building them in.

## Consequences

- M1.0 ships these from the first deploy:
  - the AGPL `LICENSE`
  - a `NOTICE`/`/about` page generated from the register
  - the footer Source link
  - a plain-language `/privacy` page
- M2.3 publishes the CC BY-SA masters dataset (2026-10-10-19).
- Chess.com import is an explicitly accepted risk with mitigations
  (2026-10-10-18-import-own-chesscom-games-accepted-risk).
- When a trigger fires, stop that action until the review is done.
