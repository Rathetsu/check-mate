# Keep raw player data append-only; aggregates are derived

Date: 2026-10-10
Status: Accepted

## Decision

CheckMate stores the raw record of every player event:
- imported games, with the original source payload and PGN
- each puzzle attempt, with one row per move played
- analysis sessions
- import runs and import failures

These raw rows are append-only. A row may change only to finish itself
(e.g. setting `completed_at`) or when the user deletes it.

Every aggregate is **derived** and must be regenerable by a job from the raw
rows. That covers accuracy per theme, opening trees, opening performance,
classifications and position indexes. We never store an aggregate in place
of the rows it came from.

Every player-data row is owned by exactly one `user_id`. Two users who
import the same Lichess game each get their own row.

## Context

Phases 1-3 build the player data layer that Phase 4 personalization will
read. Aggregates such as `fork_accuracy = 63%` can always be recomputed.
Discarded raw history cannot be recovered. Phase 4 will want analyses we
can't predict now: time per move, which wrong move, which position. The
user made this an explicit requirement.

## Alternatives rejected

- **Aggregate-only stats tables** — irreversible loss of the most valuable
  dataset.
- **One global shared `games` table referenced by many users** — complicates
  authz, per-user deletion, and per-user perspective (`user_color`,
  `user_result`). The storage saved is small at MVP scale.
- **Storing client-computed engine evals as facts** — browser results are
  forgeable and engine-version dependent. Phase 4 recomputes them
  (2026-10-10-09-browser-stockfish-behind-analysis-provider).

## Consequences

- Each derived table names its rebuild job, and the job can run at any time.
- Snapshot the context an event happened in (puzzle themes, rating, FEN at
  attempt time), so later puzzle-DB refreshes don't rewrite history.
- Account deletion cascades to all of the user's rows. Unlinking an external
  account offers to keep or delete its games.
- Every query on player data is scoped by `user_id` through `packages/core`
  helpers.
