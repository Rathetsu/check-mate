# Plan: Permission requests for historical master-game sources

Date: 2026-10-10
Status: Open (waiting on the user to send)
Decision: 2026-10-10-19-curated-masters-set-deduped-by-terminal-position

## Why

Broadcast games (CC BY-SA 4.0) only cover about 2020 onward. Historical and
weekly OTB coverage needs TWIC and/or PGN Mentor. TWIC explicitly asks online
projects to get in touch. PGN Mentor publishes no license. Until a reply
grants permission, both stay `cleared: false` in the OTB source registry.

## Tracking

| Source | Contact | Sent | Reply | Outcome | Register updated |
|---|---|---|---|---|---|
| TWIC (The Week in Chess), Mark Crowther | mdcrowth@btinternet.com | — | — | — | — |
| PGN Mentor | contact address from pgnmentor.com (not verified; look it up) | — | — | — | — |

When a reply arrives:
1. Save it, with a date, as `docs/stream/<date>-<source>-permission.decision-record.md`.
2. Update the source's row in `docs/wiki/open-source-reuse.md`, including
   the exact terms granted.
3. Only then set `cleared: true` in the OTB source registry.

## Drafts

- TWIC: [docs/outreach/twic-permission-email.txt](../outreach/twic-permission-email.txt)
- PGN Mentor: [docs/outreach/pgn-mentor-permission-email.txt](../outreach/pgn-mentor-permission-email.txt)

## Notes

- Send the emails from the address you'll keep for the project. Replies are
  the record of permission.
- **If permission excludes the public dump**, mixing those games with CC
  BY-SA broadcast games in one masters index is legally unclear. Under CC BY-SA
  4.0 §4(b), the combined database counts as adapted material. Two options:
  - Prefer the **TWIC-only masters index** and drop broadcasts. TWIC covers
    1994 to now, weekly, so it overlaps most broadcast events, and dropping
    broadcasts removes the share-alike obligation.
  - Or keep broadcasts and don't use the restricted source.
  - Record whichever is chosen as a new ADR that supersedes the source mix in
    2026-10-10-19.
