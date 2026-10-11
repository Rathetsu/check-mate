---
kind: system
---

# Architecture

Last verified: n/a. Design only; no code exists yet (2026-10-10). Once
M1.0 lands, verify this page against code and bump the date.

## System overview

CheckMate Core is an AGPL web platform for chess learning and analysis:
analysis board, editor, studies, themed puzzles, a unified opening
explorer, and a personal game database with opening trees. Users reach it in
the browser. It calls Lichess and Chess.com APIs (imports), Lichess data
dumps (puzzles, explorer data), and a self-hosted lila-openingexplorer. A
separate, proprietary CheckMate AI service (Phase 4, not in this repo) will
call Core's `/api/v1`. Core never calls the AI service's internals.

## Bird's eye view

```
                     ┌──────────────────────── Browser ────────────────────────┐
                     │ Next.js pages · <Board> (chessground) · TreeCursor       │
                     │ packages/chess (chessops rules)                          │
                     │ Web Worker: Stockfish 19 WASM ◄─ AnalysisProvider        │
                     └───────────────┬──────────────────────────────────────────┘
                                     │ HTTPS (Caddy)
┌──────────────── VPS: docker compose ┼──────────────────────────────────────────┐
│ web (Next.js 16): pages, /api/v1, Better Auth                                  │
│   └─ packages/core (Drizzle, services, ExplorerSources) ─┬─► postgres          │
│ worker (Node 24, pg-boss): imports, sync, puzzle load,   │                     │
│   explorer ingestion, position indexing ─────────────────┤                     │
│ explorer (lila-openingexplorer, RocksDB) ◄── internal only, admin never public │
└───────────┬────────────────────────────────────────────────────────────────────┘
            ▼ outbound
   lichess.org API · explorer.lichess.org (optional, user token) ·
   api.chess.com PubAPI · database.lichess.org dumps

   CheckMate AI (Phase 4, separate repo) ──► /api/v1 only
```

Three chess-truth layers (2026-10-10-02-chess-software-is-sole-source-of-chess-truth):
**Rules** = `packages/chess` over chessops. **Analysis** = `AnalysisProvider`
(browser Stockfish today). **Knowledge/Data** = Postgres + explorer. Any LLM
sits above all three.

## Module map (planned)

| Path | Responsibility | Talks to |
|---|---|---|
| `apps/web` | UI routes, `<Board>`, `/api/v1` handlers, auth, browser engine provider. No direct SQL. | `packages/core`, `packages/chess` |
| `apps/worker` | All long-running jobs (pg-boss). | `packages/core`, `packages/chess`, external APIs, explorer admin |
| `packages/chess` | Pure rules/PGN/FEN, `positionKey`, `gameFingerprint` (uploads), `terminalKey` (OTB dedup), opening classifier, `TreeCursor`, `AnalysisProvider` types. **No I/O.** | chessops |
| `packages/core` | Drizzle schema, migrations, user-scoped domain services, `ExplorerSource` adapters. **No React.** | Postgres, explorer |
| `services/explorer` | Compose and ingestion config for upstream lila-openingexplorer. **No forked code.** | — |

## Data flow

1. **Analysis:**
   - The user moves on `<Board>`, which updates `TreeCursor`, which updates
     `AnalysisProvider.analyzePosition`.
   - The provider runs in the Web Worker and streams `EngineLine` +
     `Provenance` to the engine panel.
   - The session PGN autosaves to `analysis_sessions`.
2. **Puzzle attempt:**
   - `GET /puzzles/next` (theme, band) leads to the first user move.
   - `POST /puzzles/:id/attempts` creates the attempt.
   - Each move goes to `POST /puzzle-attempts/:id/moves`. The server checks
     it against the solution and with the rules layer's mate detection, then
     appends a `puzzle_attempt_moves` row.
3. **Import → tree:**
   - Linking an account, or "Sync", enqueues `import:<platform>`.
   - The worker streams the platform API, validates and normalizes each
     game, then inserts into `games` (dedup on `user_id, source,
     source_game_id`).
   - `positions:index` writes `game_positions` and derived openings.
   - `GET /api/v1/opening-tree` is a SQL aggregate over those rows.
4. **Explorer query:**
   - `GET /api/v1/explorer?sources=all` fans out to the `lichess` and
     `masters` adapters, which call the internal explorer service.
   - The adapters' results are merged. A source is excluded, with its
     reason, when it can't honor a filter.
   - Results are annotated with `classifyOpening`.

## Invariants and boundaries

- **Rules:** only `packages/chess` (chessops) decides legality, mate,
  validity and opening names (ADR 02, 07).
- **Board:** only `<Board>` imports chessground, and board state lives in
  `TreeCursor`, not in React (ADR 08).
- **Engine:** only the `AnalysisProvider` implementation imports
  `stockfish` or parses UCI. Engine results always carry provenance, and
  browser evals are never persisted as truth (ADR 09).
- **AI boundary:** no LLM, prompt or coaching code lives in this repo. The
  AI service talks to Core only via `/api/v1`, never the DB, and never links
  GPL/AGPL code (ADR 03).
- **Raw data:**
  - Raw player data is append-only.
  - Aggregates and indexes are derived, with a rebuild job.
  - Every player row has exactly one `user_id`.
  - All access is user-scoped through `packages/core` (ADR 11).
- **Dependencies, assets and datasets:** each is registered in
  `open-source-reuse.md` before merge. Only cleared datasets are ingested
  (ADR 04, 14).
- **Chess.com data:** never enters shared statistics (ADR 14). It is imported
  only for user-linked usernames, behind the `CHESSCOM_IMPORT_ENABLED` kill
  switch (ADR 18).
- **Masters index:** rebuilt from the `explorer_otb_games` registry, never
  edited in place. Upstream can't delete games (ADR 19).
- **Explorer admin routes:** never routed publicly (ADR 16).

## External dependencies

| Dependency | Used for | Failure mode we accept |
|---|---|---|
| lichess.org API (OAuth, game export) | P3 Lichess import/sync | Sync pauses and retries; library stays usable |
| api.chess.com PubAPI | P3 Chess.com import/sync | Same as above; serial access means slow first imports |
| database.lichess.org | puzzle refresh, explorer ingestion | Monthly job retries; stale data is acceptable |
| explorer.lichess.org (optional) | `lichess-account` source | Source shows "unavailable/rate limited"; others still work |
| lila-openingexplorer (self-hosted) | explorer stats | Explorer panel degrades; board and analysis unaffected |
| SMTP provider | verification, reset | Sign-up verification is delayed |

## Key decisions

- docs/adr/2026-10-10-02-chess-software-is-sole-source-of-chess-truth.md
- docs/adr/2026-10-10-03-separate-open-source-core-from-proprietary-ai-service.md
- docs/adr/2026-10-10-04-license-core-agpl-3-or-later.md
- docs/adr/2026-10-10-05-typescript-monorepo-nextjs-and-node-worker.md
- docs/adr/2026-10-10-06-postgres-drizzle-and-pg-boss.md
- docs/adr/2026-10-10-07-chessops-is-the-rules-layer.md
- docs/adr/2026-10-10-08-single-chessground-board-component.md
- docs/adr/2026-10-10-09-browser-stockfish-behind-analysis-provider.md
- docs/adr/2026-10-10-10-better-auth-for-accounts-and-lichess-oauth.md
- docs/adr/2026-10-10-11-raw-player-data-append-only-aggregates-derived.md
- docs/adr/2026-10-10-12-lichess-puzzle-db-and-theme-taxonomy.md
- docs/adr/2026-10-10-13-study-chapters-stored-as-pgn.md
- docs/adr/2026-10-10-14-self-hosted-opening-explorer-from-licensed-data.md
- docs/adr/2026-10-10-15-personal-opening-tree-as-derived-postgres-index.md
- docs/adr/2026-10-10-16-docker-compose-on-single-vps.md
- docs/adr/2026-10-10-17-self-administered-license-compliance.md
- docs/adr/2026-10-10-18-import-own-chesscom-games-accepted-risk.md
- docs/adr/2026-10-10-19-curated-masters-set-deduped-by-terminal-position.md
- Cross-cutting contracts: docs/stream/2026-10-10-core-architecture.spec.md
