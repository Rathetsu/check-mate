# Import users' own Chess.com games as an accepted risk

Date: 2026-10-10
Status: Accepted

## Decision

CheckMate imports a user's public Chess.com games through the Published-Data
API (PubAPI), on that user's request, for usernames they link, and stores
them privately in their library. This is a known, accepted risk under
Chess.com's User Agreement. Mitigations:

- **Who:** user-initiated only. Linked usernames only, at most 3 Chess.com
  usernames per CheckMate user. No importing arbitrary players and no
  background crawling.
- **How:**
  - serial requests only
  - a `User-Agent` with a contact address
  - ETag caching
  - the current month re-fetched, older months only when changed
- **Where data goes:** games are private to their owner and never pooled into
  shared statistics or datasets
  (2026-10-10-14-self-hosted-opening-explorer-from-licensed-data). Unlinking
  offers deletion.
- **Kill switch:** the env flag `CHESSCOM_IMPORT_ENABLED` disables linking
  and sync instantly. Manual PGN upload stays available as the fallback.
- **Honour requests:** any Chess.com request is honoured promptly, following
  the takedown runbook in the P3 import spec.

## Context

The user approved this on 2026-10-10, citing OpeningTree, which imports
Chess.com games the same way.

The User Agreement (checked 2026-10-10):
- §2(C) says game records "can be accessed, used, and monetized by anyone".
- §2(D) and §4(D) restrict "download", "game databases" and "dataset
  creation".

One honest difference from OpeningTree: OpeningTree fetches in the user's
browser and stores nothing server-side. CheckMate persists the games, which
the brief requires.

## Alternatives rejected

- **No Chess.com support** — drops half the target users and a core brief
  requirement.
- **PGN upload only** — works, but the user has to download monthly
  archives by hand. Kept as the fallback.
- **Fetch in the browser, store nothing** (OpeningTree model) — fails the
  persistent-library requirement.

## Consequences

- Never add features that import other players' Chess.com games
  ("scouting") without a new ADR.
- A complaint from Chess.com is a legal-review trigger
  (2026-10-10-17-self-administered-license-compliance).
