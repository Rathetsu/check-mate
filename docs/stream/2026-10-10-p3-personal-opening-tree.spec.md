# Spec: Personal opening tree, opening performance and comparison

Date: 2026-10-10
Status: Approved (design; no code yet)
Phase: 3 · Milestones M3.4 (tree + performance) and M3.5 (My Games explorer source + compare)

## Goal

OpeningTree-style exploration of the user's own games, persisted. From any
position, the user sees which moves they (and their opponents) played, how
often, and their W/D/L from their own side, filtered by color, platform,
rating, time control and date. A performance page summarizes what they
actually play. The "My Games" explorer source lets them compare themselves
against Lichess and Masters statistics.

Decisions: 2026-10-10-15-personal-opening-tree-as-derived-postgres-index ·
2026-10-10-11-raw-player-data-append-only-aggregates-derived ·
2026-10-10-14-self-hosted-opening-explorer-from-licensed-data.
Contract: `ExplorerSource` (core-architecture spec).

## Scope

In: the `game_positions` index and its jobs, derived opening
classification, the tree query and API, the tree UI (explorer panel `me`
source), the `/openings` performance page, the compare view.
Out: scouting other players, engine-based repertoire suggestions (Phase 4),
"prep gap" recommendations phrased as advice (Phase 4). P3 shows data only.

## Derived index

- **P3-OT-01 MUST** Worker job `positions:index {gameIds}` runs after
  import. For each standard game, it writes one row per ply 0..39:
  `(user_id, game_id, ply, position_key, move_uci, move_san)`.
  - `position_key` is the position *before* `move_uci`.
  - If the game ends before ply 40, the final position gets a row with
    `move_uci = NULL`.
  - Sets `games.positions_indexed_at` on the game row.
- **P3-OT-02 MUST** Derived opening classification is computed in the same
  job. `games.opening_eco/opening_name/opening_ply` are set to the deepest
  classified position within the indexed plies, via `classifyLine`. This
  gives consistent names across Lichess, Chess.com and uploads.
- **P3-OT-03 MUST** Incremental: new games are indexed on their own, and
  existing rows are never recomputed on sync.
- **P3-OT-04 MUST** Rebuild jobs:
  - `positions:reindex-user {userId}`
  - `positions:reindex-all`, run after a ply-cap change or a chess-openings
    update
  - Both delete and rewrite derived rows only. Raw `games` columns are
    untouched.
- **P3-OT-05 MUST** Index `(user_id, position_key)`. Filters join `games`.
  If p95 misses the target, denormalize `user_color, speed, played_at,
  source` onto `game_positions` (a known upgrade path; keep a ponytail
  comment in the code).

## Tree query

- **P3-OT-10 MUST** Input:
  - the position (`fen` or `play`)
  - `color` (`white` \| `black` \| `both`; default `white`)
  - filters: platforms, accounts, speeds, rated, my rating range, opponent
    rating range, date range
- **P3-OT-11 MUST** Output is `PositionStats` with `perspective: 'user'`:
  - **Per move:** games (distinct), wins/draws/losses from the user's side,
    score %, last played date, average opponent rating.
  - **Totals.**
  - **Most recent games:** the 20 latest games reaching the position.
- **P3-OT-12 MUST** Count `COUNT(DISTINCT game_id)` per move, so a game that
  repeats a position isn't counted twice.
- **P3-OT-13 MUST** Transpositions merge because rows are keyed by position.
  The UI notes "includes transpositions".
- **P3-OT-14 MUST** Games with `user_color IS NULL` (uploads with no
  identity) are excluded from user-perspective stats, and the UI shows how
  many were excluded.
- **P3-OT-15 MUST** Positions beyond ply 40 return "Beyond the indexed
  depth (40 plies)" rather than empty stats.
- **P3-OT-16 MUST** p95 < 300 ms at 50k games with any filter combination.

## UI

### My Games source (explorer panel)

- **P3-OT-20 MUST** `me` is registered as an `ExplorerSource` with these
  capabilities:
  - perspective: user
  - date: day
  - ratings: own and opponent ranges
  - speeds
  - color
  - platform
  - It appears in the source picker for signed-in users with at least one
    indexed game.
- **P3-OT-21 MUST** A color toggle (As White / As Black / Both) and
  platform chips (Lichess / Chess.com / Uploads; the default is all, i.e.
  combined) sit in the panel header. Switching never re-imports anything.
- **P3-OT-22 MUST** Moves table:
  - Shows each move, games, a W/D/L bar from the user's side, score %, last
    played, and average opponent rating.
  - Opponent moves (positions where it's the opponent's turn) are shown
    with an "opponent's choice" style.
  - Click plays the move on the board.
- **P3-OT-23 MUST** A "Games" list under the table shows the recent games
  for this position. Each opens in `/games/[id]` at this ply.

### Opening performance (`/openings`)

- **P3-OT-30 MUST** Two tables, As White and As Black. Each row is an opening
  (family level, e.g. "Sicilian Defense", expandable to its variations),
  with:
  - games and % of the user's games with that color
  - W/D/L % and score %
  - average opponent rating
  - last played
- **P3-OT-31 MUST** Expanding an opening shows its most common
  continuations: the top 5 moves after the opening's classified position,
  from the tree query.
- **P3-OT-32 MUST** Clicking opens the explorer at that opening's position
  with the `me` source selected.
- **P3-OT-33 MUST** The same filters as the tree, persisted in the URL.
- **P3-OT-34 COULD** "Positions you reach most often": the top positions by
  game count beyond ply 10.

### Compare (M3.5)

- **P3-OT-40 MUST** The compare view (reusing P2-EX-37) puts `me` beside
  `lichess`, `masters`, or `all`. Each row is the union of moves from both
  sides, showing:
  - my games, my score, the database popularity %, and the database score
  - Both scores are expressed **for the user's side**: when the user is
    Black, database Black-win% becomes the score.
- **P3-OT-41 MUST** Data-only highlights:
  - "You've faced this 0 times — 34% of Lichess games"
  - "You play this in 60% of games — 5% of Masters games"
  - No evaluative language ("bad", "should play"). That is Phase 4,
    grounded in engine data.
- **P3-OT-42 MUST** Filters apply per side according to each source's
  capabilities (CORE-30).

## API surface

- `GET /api/v1/opening-tree?fen=|play=&color=&platforms=&accounts=&speeds=&rated=&myMin=&myMax=&oppMin=&oppMax=&from=&to=`
  returns `PositionStats` (perspective user). Also reachable as
  `/api/v1/explorer?sources=me`.
- `GET /api/v1/openings/performance?color=&<filters>` returns family rows
  with nested variations.
- `POST /api/v1/admin/positions/reindex` (operator only); `POST /api/v1/me/positions/reindex` (user, rate-limited 1/day).

## Reuse

| Component | Mode |
|---|---|
| OpeningTree UX (color toggle, perspective W/D/L, filters) | reference only (GPL-3.0; ideas, not code) |
| Explorer panel and compare view | reused (internal, P2) |
| chess-openings classification | reused data (CC0) |
| Index, query, `/openings` | independent |

## Chess-authority notes

Every number is a count over the user's real, rules-validated games.
Opening names come only from the classifier. Comparisons state frequencies
and scores, never judgments.

## Phase 4 hooks

`/api/v1/opening-tree` and `/api/v1/openings/performance` answer "what
openings do you play and how do they go" from data. Phase 4 combines them
with engine analysis of the user's own positions.

## Acceptance criteria

- Unit (SQL against fixtures):
  - a game repeating a position counts once (P3-OT-12)
  - perspective is correct for a Black win
  - transposition fixtures merge
- Fixture user with 500 games:
  - the tree for 1.e4 as White matches hand-computed counts per move
  - platform chip toggles change the counts as expected
  - the `/openings` rows sum to the total games per color
- Changing the ply cap constant and running `reindex-user` changes
  `game_positions` only; `games` raw columns are byte-identical.
- Compare me vs lichess: score columns flip correctly when the user is Black.
- Performance fixture with 50k games meets P3-OT-16.

## Open questions

- Default color when the user lands on the `me` source: always White, or the
  color of the side to move in the current line? Default: White (OpeningTree
  convention); revisit after usability testing.
