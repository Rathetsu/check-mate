# Spec: Unified opening explorer (API and UI)

Date: 2026-10-10
Status: Approved (design; no code yet)
Phase: 2 · Milestones M2.1 (API + ECO), M2.2 (UI), M2.4 (unified view, masters browsing, study import), M2.5 (COULD account source)

## Goal

Users explore openings interactively. For each position they see the moves
played, game counts and W/D/L percentages, filtered by source, rating, time
control and date. They can open master games, jump to engine analysis, and
save positions to studies. Data from several sources is merged without double
counting.

Decisions: 2026-10-10-14-self-hosted-opening-explorer-from-licensed-data ·
2026-10-10-02-chess-software-is-sole-source-of-chess-truth.
Contract: `ExplorerSource` (core-architecture spec). Data feed:
p2-explorer-data-pipeline spec.

## Scope

In: `/api/v1/explorer`, source registry endpoint, opening identification,
explorer panel (as a tab on every board page), the `/explorer` page, master
game viewer and search, compare view, add-to-study.
Out: the `me` source (P3 adds it via the same contract), engine-based
"book moves", tablebase.

## Sources

| id | Data | Ratings filter | Speeds filter | Date filter | In "All" |
|---|---|---|---|---|---|
| `lichess` | self-hosted Lichess index (sampled) | yes (Lichess buckets) | yes | month | yes |
| `masters` | self-hosted OTB index (deduped) | no | treated as classical | year | yes |
| `all` | union of `lichess` + `masters` | per source capability | per source | per source | — |
| `lichess-account` (COULD) | explorer.lichess.org proxied with the **user's own** Lichess token | yes | yes | month | **never** (overlaps `lichess`) |
| `me` (P3) | user's games | own/opponent rating | yes | day | **never** (compare only) |

- **P2-EX-01 MUST** Chess.com data appears in no shared source. The source
  picker shows a non-selectable "Chess.com" entry with the message: "Not
  available: Chess.com's terms don't allow shared game databases. Your own
  Chess.com games appear under My Games (coming in Phase 3)."
- **P2-EX-02 MUST** Each source shows its attribution and coverage, e.g.
  "Masters: 412,309 OTB games from Lichess broadcasts (CC BY-SA 4.0),
  2020–2026 · Download dataset". The download link goes to `/about/data`
  (P2-EI-35).

## API

`GET /api/v1/explorer`

| Param | Meaning |
|---|---|
| `fen` or `play` | `fen` = position; `play` = UCI moves from start (preferred; preserves the line for opening names) |
| `sources` | `all` (default) \| `lichess` \| `masters` \| `lichess-account` \| `me` (comma list allowed for compare) |
| `ratings` | Lichess buckets, e.g. `1600,1800,2000` |
| `speeds` | `bullet,blitz,rapid,classical,correspondence` |
| `since`, `until` | `YYYY-MM` (adapters round to their granularity and report it) |
| `moves`, `topGames` | limits (defaults 12 and 8) |

Response:

```json
{ "position": { "fen": "...", "positionKey": "...",
                "opening": { "eco": "B90", "name": "Sicilian Defense: Najdorf Variation", "exact": true } },
  "merged": { "source": "all", "total": {...}, "moves": [...] },
  "sources": [ { "source": "lichess", "total": {...}, "moves": [...], "topGames": [...], "recentGames": [...] },
               { "source": "masters", "excludedBecause": "ratings filter not supported" } ] }
```

- **P2-EX-10 MUST** `merged.moves[u] = Σ over included sources` of
  white/draws/black/games. `averageRating` is game-weighted over sources that
  report it, and marked partial when not every included source reports it.
- **P2-EX-11 MUST** A source excluded by an active filter is listed with
  `excludedBecause` and contributes nothing (CORE-30).
- **P2-EX-12 MUST** Per-source breakdowns are always returned alongside
  `merged`, so source-specific stats stay accessible.
- **P2-EX-13 MUST** The server validates `fen`/`play` through the rules
  layer. Invalid input returns 400 with the PGN/FEN error envelope.
- **P2-EX-14 MUST** Self-hosted sources are queried without a cache by
  default. Add a short-TTL cache only if measured p95 exceeds 150 ms.
  `lichess-account` responses are cached in Postgres
  (`explorer_cache`, key = source + positionKey + filters, TTL 24 h) to
  respect the 20 req/min/user limit. On 429 the source returns
  `excludedBecause: "rate limited, retry in Ns"`.
- **P2-EX-15 MUST** `GET /api/v1/explorer/sources` returns the registry:
  id, label, capabilities, coverage, attribution and availability for this
  user. `lichess-account` is available only with a linked Lichess account.
- **P2-EX-16 MUST** `GET /api/v1/explorer/masters/games/:mastersId` returns
  PGN plus metadata (players, Elo, event, site, date, round, result, opening)
  from `explorer_otb_games`.
- **P2-EX-17 SHOULD** `GET /api/v1/explorer/masters/games?player=&event=&from=&to=&eco=`
  is a paginated search over the OTB registry ("view master games
  separately").

## Opening identification

- **P2-EX-20 MUST** `classifyOpening(positionKey)` uses
  lichess-org/chess-openings (CC0) `epd` → `{eco, name}`. The match is
  position-based, so transpositions are recognized.
- **P2-EX-21 MUST** When the exact position has no entry, the UI shows the
  last classified position on the current line, labelled as such. For
  example: "B90 Sicilian Defense: Najdorf Variation · last named at move 6".
  If no ancestor is classified, show nothing. Never invent or approximate a
  name (2026-10-10-02).
- **P2-EX-22 MUST** The chess-openings data is vendored at a pinned commit.
  Updating it is an explicit task that re-runs derived classifications (P3).

## UI

Explorer panel (a tab on analysis, study, game and `/explorer` pages):

- **P2-EX-30 MUST** Header: opening name/ECO (P2-EX-21), source picker, and
  a filters button showing the active-filter count.
- **P2-EX-31 MUST** Moves table, one row per move:
  - SAN
  - games (count and % of the position)
  - W/D/L stacked bar with percentages, from White's perspective (user's
    perspective for `me`)
  - average rating where available
  - The last row is a total.
  - **Interaction:** click plays the move on the board; hover draws an
    arrow; keyboard ↑/↓ moves through rows, Enter plays.
- **P2-EX-32 MUST** Filters popover:
  - rating buckets, speeds, date range
  - Controls a source can't honour are shown with an "applies to: Lichess
    only" hint.
  - Changing a filter re-queries immediately.
  - Filters persist per user (preferences).
- **P2-EX-33 MUST** In the "All" view each row expands to per-source counts.
- **P2-EX-34 MUST** Top games, and recent games for `lichess`:
  - Each shows players, ratings, result, date/year and event (masters).
  - A master game opens in the analysis board (PGN from P2-EX-16).
  - A Lichess game links out to lichess.org/<id>; we hold no PGN for it.
- **P2-EX-35 MUST** Actions:
  - **Analyze:** opens the analysis board with the current line and the
    engine on.
  - **Add to study:** a chapter from the line's PGN with the explorer
    stats snapshot in the chapter comment, sourced and dated.
  - **Copy FEN/PGN.**
- **P2-EX-36 MUST** Empty, loading and error states. An empty state says
  "No games for this position with current filters". A failing source shows
  an error for that source only; the board keeps working.
- **P2-EX-37 SHOULD** Compare view: two sources side by side, e.g. Lichess
  vs Masters, with each move's popularity and score difference. P3 reuses it
  for My Games vs X.
- **P2-EX-38 MUST** The `/explorer` page has the board, explorer panel and
  engine tab. The engine is off by default; toggling it uses the same
  `AnalysisProvider`.
- **P2-EX-39 MUST** The panel is usable at phone width: the table collapses
  to SAN, games and a W/D/L bar, and filters open in a bottom sheet.

## Data model

```
explorer_cache (key text PK, payload jsonb, created_at timestamptz)  -- lichess-account only
user_preferences + explorer_filters jsonb                             -- persisted filters
```

## Reuse

| Component | Mode |
|---|---|
| lila-openingexplorer HTTP API (`/lichess`, `/masters`) | reused |
| lila `ui/analyse` explorer panel | functional reference (table layout, W/D/L bar) |
| lichess-org/chess-openings | reused data (CC0) |
| Merge logic, API, UI | independent |

## Chess-authority notes

Every figure is a count from an indexed dataset, with its source shown.
Opening names come only from the classification dataset. The explorer makes
no evaluative claims, and "best move" is never inferred from popularity.

## Phase 4 hooks

`/api/v1/explorer` with `sources=` gives the AI service verified statistics
and real master games per position. Provenance comes from `sources[].source`
and the attribution.

## Acceptance criteria

- API: the start position with `sources=all` returns `merged` equal to the
  sum of the `lichess` and `masters` breakdowns (test with fixture indexes).
- With a ratings filter: `masters` is excluded with a reason, and `merged`
  equals `lichess` only.
- Playwright: 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 by clicking
  explorer rows → header reads "B90 Sicilian Defense: Najdorf Variation" →
  open a master game → the analysis board loads it → Add to study → the
  chapter exists.
- An unclassified deep position shows the last-named label, never a guessed
  name.
- p95 latency < 150 ms for `sources=all` without a cache, on the deployed
  hardware.
- The Chess.com entry shows its explanation and can't be selected.

## Open questions

- M2.5 `lichess-account` source: build only if users ask for full Lichess
  coverage beyond the sampled index.
