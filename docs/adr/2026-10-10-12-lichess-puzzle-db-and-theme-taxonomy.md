# Lichess puzzle database and theme taxonomy; no gamified modes

Date: 2026-10-10
Status: Accepted

## Decision

Puzzles come from the Lichess puzzle CSV (database.lichess.org, CC0, 6.16M
puzzles as of 2026-10-05), imported into Postgres and refreshed by a worker
job. Theme keys are Lichess's verbatim (`fork`, `pin`, `mateIn2`,
`discoveredAttack`, ...), grouped as Lichess groups them.

A played move is accepted when it is either:
- the stored solution move, or
- any move that delivers checkmate, at any ply (checked by the rules layer).

This mirrors lila `ui/puzzle/src/moveTest.ts`. Castling written as
king-takes-rook is normalized. Every other move fails.

Phase 1 ships deliberate themed practice only. There is no Streak, Storm,
Racer, leaderboard, or competitive puzzle rating.

## Context

The brief asks for theme-chosen tactical practice using the existing Lichess
taxonomy, and for attempts stored for Phase 4.

CSV columns: `PuzzleId, FEN, Moves, Rating, RatingDeviation, Popularity,
NbPlays, Themes, GameUrl, OpeningTags, DailyDate`. The FEN is the position
*before* the opponent's move. `Moves[0]` is auto-played, and the user
solves from `Moves[1]`.

## Alternatives rejected

- **Own taxonomy** — the brief says reuse Lichess's; ours would not match
  puzzle tags.
- **Calling Lichess's puzzle API at runtime** — rate limits, external
  dependency, and no theme-filtered random selection.
- **Generating our own puzzles** — needs an engine pipeline; out of scope.
- **Puzzle rating for users** — a gamification the user explicitly
  deprioritized. Difficulty uses fixed puzzle-rating bands instead.

## Consequences

- Attempts snapshot themes, rating and FEN
  (2026-10-10-11-raw-player-data-append-only-aggregates-derived).
- A refresh that drops a puzzle never deletes the attempts that reference it.
- Theme descriptions are our own short text. lila's i18n strings (AGPL) may be
  adapted with attribution.
- Attribution to Lichess is not required by CC0, but is given in the reuse
  register and on the About page.
