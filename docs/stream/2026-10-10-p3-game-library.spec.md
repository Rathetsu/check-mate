# Spec: Personal game library

Date: 2026-10-10
Status: Approved (design; no code yet)
Phase: 3 · Milestone M3.3

## Goal

A fast, filterable library of every game the user imported (Lichess,
Chess.com, PGN uploads), with complete metadata. Any game opens in the
analysis board with one click.

Decisions: 2026-10-10-11-raw-player-data-append-only-aggregates-derived ·
2026-10-10-08-single-chessground-board-component.
Data: the `games` table (p3-external-accounts-and-game-import spec).

## Scope

In: list, filters, search, sort, pagination, game detail view, deletion,
export, per-source counts.
Out: editing game data (the raw import is immutable), sharing games, tagging
or collections (COULD later).

## Requirements

### List (`/games`)

- **P3-GL-01 MUST** Each row shows:
  - date
  - platform icon (Lichess / Chess.com / Upload) and account
  - White and Black names with ratings
  - result as a user-perspective badge (W/D/L, or the plain result when
    perspective is unknown)
  - speed icon and time control
  - rated or casual
  - opening (our classifier's ECO and name; tooltip shows the source's own
    opening label)
  - move count
- **P3-GL-02 MUST** Filters, combinable, reflected in the URL query string:
  - source / account
  - my color
  - result (win/draw/loss)
  - speed
  - rated
  - date range
  - my rating range
  - opponent rating range
  - opening (ECO prefix or name)
  - variant (standard only by default)
- **P3-GL-03 MUST** Search by opponent name (case-insensitive substring
  using a trigram index) and by opening name.
- **P3-GL-04 MUST** Sort by date (default, newest first), my rating, or
  opponent rating. Keyset pagination, 50 per page, with infinite scroll on
  mobile.
- **P3-GL-05 MUST** A header shows counts per source and account, the total,
  and the last sync time with a "Sync" shortcut.
- **P3-GL-06 MUST** Empty state with "Connect Lichess / Chess.com" and
  "Upload PGN" calls to action.
- **P3-GL-07 MUST** p95 list query < 200 ms at 50k games with any single
  filter.

### Detail (`/games/[id]`)

- **P3-GL-10 MUST** Opens the analysis board with the game's PGN as the
  mainline. The mainline is never mutated. User variations and comments go
  into an `analysis_sessions` row with `source_type='game'` (analysis-board
  spec), and reopening the game resumes that session.
- **P3-GL-11 MUST** The metadata panel shows players and ratings, result and
  termination, date, time control, rated, source link, opening (ours and the
  source's), and import date.
- **P3-GL-12 MUST** Clock times from `%clk` show beside moves.
  Platform-provided evals and accuracies appear only in a "From Lichess" /
  "From Chess.com" section, labelled with their source (2026-10-10-02).
- **P3-GL-13 MUST** Tabs: Moves, Engine (browser `AnalysisProvider`),
  Explorer (all sources including My Games), Info.
- **P3-GL-14 MUST** Actions: Add to study, Copy PGN, Download PGN, Open
  original, Previous/next game in the current filter.
- **P3-GL-15 SHOULD** A clock-usage chart (time per move from `%clk`).

### Management

- **P3-GL-20 MUST** Multi-select delete, with confirmation. Deleting a game
  also removes its `game_positions` rows. This is user-initiated deletion,
  which ADR 11 allows.
- **P3-GL-21 SHOULD** Export the filtered set as one PGN. Large exports run
  as a job that emails a download link. This also serves data portability.

## API surface

- `GET /api/v1/games?source=&account=&color=&result=&speed=&rated=&from=&to=&myMin=&myMax=&oppMin=&oppMax=&eco=&q=&sort=&cursor=` returns `{items, nextCursor}`
- `GET /api/v1/games/:id` returns the full record (including `raw` on request: `?include=raw`)
- `GET /api/v1/games/stats` returns counts per source/account and the last sync
- `DELETE /api/v1/games` with `{ids[]}`
- `POST /api/v1/games/export` with filters, returns `{jobId}` (SHOULD)

Every endpoint is scoped by `userId` (CORE-51). An unknown or foreign id
returns 404.

## Reuse

| Component | Mode |
|---|---|
| Analysis board, `<Board>`, explorer panel | reused (internal) |
| Library UI | independent (shadcn data table) |

## Chess-authority notes

Results and perspective come from stored source data. Opening labels come
from the classifier, with the source's label kept separately. Evals from
platforms are always attributed.

## Phase 4 hooks

`/api/v1/games` with filters is how the AI service lists and fetches a
user's real games, e.g. "your last 20 Najdorf games as Black".

## Acceptance criteria

- Playwright, seeded with 300 games across 2 platforms:
  - filtering by "Black + loss + blitz + Sicilian" shows the right count,
    and the URL round-trips the filter
  - clicking a game opens the analysis board with the correct final
    position
  - adding a variation, then reloading, keeps the variation and leaves the
    game PGN unchanged
- Perspective: a game where the user had Black and won shows a "W" badge.
- Delete 2 games: counts update, and their `game_positions` rows are gone.
- A 50k-game performance fixture meets P3-GL-07.

## Open questions

None.
