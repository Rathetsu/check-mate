---
kind: system
---

# Architecture

Last verified: 2026-10-11, against the M1.4 code (`apps/web`,
`apps/worker`, `packages/core`, `packages/chess`, `services/tablebase`).
`services/explorer` arrives in Phase 2. Rows for parts not built yet
describe the design.

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
│ tablebase (lila-tablebase, tablebase files, read-only volume) ◄── internal     │
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

## Module map

| Path | Responsibility | Talks to |
|---|---|---|
| `apps/web` | UI routes, `<Board>` (play, view and the editor's free mode), `AnalysisBoard` (`components/analysis/`, reused by studies), `/api/v1` handlers, and the browser engine provider in `src/engine/` (the only Stockfish and UCI code). No direct SQL. Every `/api/v1` handler goes through `src/lib/api.ts`: `route()` (signed in) or `publicRoute()` (anyone, `userId` may be null). Both resolve the session into a `userId` (CORE-42), validate with zod and return the CORE-41 error envelope. Better Auth is mounted at `/api/auth/*`. `next.config.ts` makes `/analysis` and `/studies` cross-origin isolated (COOP + COEP) for the multi-threaded engine | `packages/core`, `packages/chess` |
| `apps/worker` | All long-running jobs (pg-boss), one file per job in `src/jobs/`. So far: the daily purge of idle free-analysis sessions | `packages/core`, `packages/chess`, external APIs, explorer admin |
| `packages/chess` | Pure rules over chessops: `fen.ts` (validation lists every reason), `moves.ts`, `keys.ts` (`positionKey`), `pgn.ts` (game splitting, error locations, export options), `tree.ts` (`TreeCursor`), `ops.ts` (`TreeOp` + `applyOp`, the only way the board changes a tree), `editor.ts` (board-editor state, castling and en passant availability), `glyphs.ts`, `openings.ts` (`classifyLine` over the generated `data/openings.json`), `advice.ts` (winning chances), `analysis.ts` (`AnalysisProvider` + fake provider). Later: `gameFingerprint` (P3), `terminalKey` (P2). Its `tsconfig` has no DOM or Node types. Tests and the fixture corpus sit in `test/` and `fixtures/`. **No I/O.** | chessops |
| `packages/core` | Drizzle schema (`src/schema/`), SQL migrations (`drizzle/`), the Better Auth instance (`src/auth.ts`), `sendEmail`, user-scoped domain services (preferences, account, analysis sessions, tablebase lookups, studies and their members behind the `studyAccess` gate), the in-process study pub/sub (`src/pubsub.ts`), `ExplorerSource` adapters. Its subpath `@checkmate/core/shared` is pure (zod schemas, preference allowlists), so client components may import it. `db` is not exported. **No React.** | Postgres, `packages/chess`, tablebase service, explorer |
| `services/explorer` | Compose and ingestion config for upstream lila-openingexplorer. **No forked code.** | — |
| `services/tablebase` | Dockerfile that builds upstream lila-tablebase at a pinned commit. Compose service `tablebase` (profile `tablebase`) reads the files from `TABLEBASE_DIR` on a read-only volume and is published only on `127.0.0.1:9000`; Caddy never routes to it. `scripts/fetch-tablebases.sh` downloads the 3-5 piece files (2026-10-11-06). **No forked code.** | — |

## Data flow

1. **Analysis:**
   - A move on `<Board>` becomes an `addNode` op; `applyOp` changes the
     `TreeCursor`, and the host hears about the op (autosave on
     `/analysis`, a POST in studies).
   - The new position goes to `AnalysisProvider.analyzePosition`. The
     provider runs Stockfish in a Web Worker and streams `EngineLine` +
     `Provenance`; lines are tagged with their FEN and shown only for it.
   - For 3-5 pieces, the tablebase panel asks `GET /api/v1/tablebase`,
     which asks the tablebase service. It is shown apart from the engine.
   - For a signed-in user, the PGN and current path autosave to
     `analysis_sessions` 5 s after the last change and on page hide.
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
5. **Study edit (shared or collaborative, 2026-10-11-04):**
   - `AnalysisBoard` applies the op at once; `useStudyOps` posts it to
     `POST /api/v1/studies/:id/chapters/:chapterId/ops`, one at a time.
   - `applyChapterOp` waits its turn in a per-chapter in-process queue, then
     in one transaction checks `studyAccess`, locks the chapter row, loads the
     PGN, applies the op with `applyOp` (the server stamps the comment
     author), writes the PGN and bumps `version`.
   - After the commit the op is published to the study's subscribers
     (`packages/core/src/pubsub.ts`, a map on `globalThis`), and
     `GET /api/v1/studies/:id/events` streams it as SSE to every open tab.
     Each tab applies the next version or reloads the chapter (see the
     studies spec build notes). With sync on, navigation is shared the same
     way.
   - Changing visibility, members or roles closes the study's streams; they
     reconnect and are checked again.
   - **Ceiling:** pub/sub and the op queue live in one web process. A second
     web process needs Postgres `LISTEN/NOTIFY` (and a lock instead of the
     queue).

## Invariants and boundaries

- **Rules:** only `packages/chess` (chessops) decides legality, mate,
  validity and opening names (ADR 02, 07).
- **Board:** only `<Board>` (`apps/web/src/components/board/Board.tsx`)
  imports chessground, and board state lives in `TreeCursor`, not in React
  (ADR 08). PGN files are indexed in a Web Worker, never on the page's main
  thread.
- **Engine:** only the `AnalysisProvider` implementation
  (`apps/web/src/engine/`) loads Stockfish or parses UCI. Pages that run
  it are cross-origin isolated, and links into or out of them are full page
  loads. Engine results always carry provenance, and
  browser evals are never persisted as truth (ADR 09). Saved game reviews are
  a private, labelled, per-user cache that nothing else reads
  (2026-10-11-05).
- **AI boundary:** no LLM, prompt or coaching code lives in this repo. The
  AI service talks to Core only via `/api/v1`, never the DB, and never links
  GPL/AGPL code (ADR 03).
- **Lint boundaries:** the dependency direction and import rules above are
  enforced by ESLint `no-restricted-imports`, plus a no-DOM, no-Node
  tsconfig for `packages/chess` (2026-10-11-01). `test/boundaries.test.ts`
  proves each rule fires.
- **No build step for packages:** workspace packages ship TypeScript source.
  Next transpiles them, and Node 24 runs them directly (2026-10-11-07).
- **Raw data:**
  - Raw player data is append-only. Analysis sessions are the exception:
    they are mutable working copies (2026-10-11-02).
  - Aggregates and indexes are derived, with a rebuild job.
  - Every player row has exactly one `user_id`.
  - All access is user-scoped through `packages/core` (ADR 11). Studies are
    the one exception: public, unlisted and member access goes through the
    single `studyAccess` gate (2026-10-11-04).
- **Dependencies, assets and datasets:** each is registered in
  `open-source-reuse.md` before merge. Only cleared datasets are ingested
  (ADR 04, 14).
- **Chess.com data:** never enters shared statistics (ADR 14). It is imported
  only for user-linked usernames, behind the `CHESSCOM_IMPORT_ENABLED` kill
  switch (ADR 18).
- **Masters index:** rebuilt from the `explorer_otb_games` registry, never
  edited in place. Upstream can't delete games (ADR 19).
- **Explorer admin routes:** never routed publicly (ADR 16).
- **Tablebase:** results come only from the self-hosted tablebase service, never
  the Lichess API. Positions outside the installed piece count show nothing
  (2026-10-11-06).

## External dependencies

| Dependency | Used for | Failure mode we accept |
|---|---|---|
| lichess.org API (OAuth, game export) | P3 Lichess import/sync | Sync pauses and retries; library stays usable |
| api.chess.com PubAPI | P3 Chess.com import/sync | Same as above; serial access means slow first imports |
| database.lichess.org | puzzle refresh, explorer ingestion | Monthly job retries; stale data is acceptable |
| explorer.lichess.org (optional) | `lichess-account` source | Source shows "unavailable/rate limited"; others still work |
| lila-openingexplorer (self-hosted) | explorer stats | Explorer panel degrades; board and analysis unaffected |
| lila-tablebase (self-hosted) + tablebase file mirror (one-off download) | endgame results ≤5 pieces | Tablebase section hidden; board and engine unaffected |
| SMTP provider (optional until launch, 2026-10-11-03) | verification, reset, email change | Not configured: links go to the server log and the operator passes them on. Verification is not required, so sign-up never blocks |

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
- docs/adr/2026-10-11-01-eslint-prettier-enforce-boundaries.md
- docs/adr/2026-10-11-02-analysis-sessions-are-mutable-working-copies.md
- docs/adr/2026-10-11-03-soft-launch-without-email-service.md
- docs/adr/2026-10-11-04-shared-collaborative-studies-ops-over-pgn.md
- docs/adr/2026-10-11-05-saved-browser-reviews-are-private-labelled-cache.md
- docs/adr/2026-10-11-06-self-hosted-syzygy-tablebase.md
- docs/adr/2026-10-11-07-internal-packages-ship-typescript-source.md
- Cross-cutting contracts: docs/stream/2026-10-10-core-architecture.spec.md
