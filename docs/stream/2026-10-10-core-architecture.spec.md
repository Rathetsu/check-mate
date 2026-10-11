# Spec: Core architecture and cross-cutting contracts

Date: 2026-10-10
Status: Approved (design; no code yet)
Phase: 1-3 (foundation for all features)

## Goal

Define the module layout, the three chess-truth layers, and the contracts
(`AnalysisProvider`, `ExplorerSource`, `/api/v1`) that every feature spec
builds on. Phase 4 must be able to plug in without rewriting Phases 1-3.

Decisions this spec relies on (read for the why):
2026-10-10-02-chess-software-is-sole-source-of-chess-truth ·
2026-10-10-03-separate-open-source-core-from-proprietary-ai-service ·
2026-10-10-05-typescript-monorepo-nextjs-and-node-worker ·
2026-10-10-06-postgres-drizzle-and-pg-boss ·
2026-10-10-11-raw-player-data-append-only-aggregates-derived.

## System map

```
                       CHECKMATE
       ┌───────────────────┼────────────────────┐
  CHESS PLATFORM       PLAYER DATA          AI COACH (Phase 4,
  rules · board ·      games · puzzles ·    separate repo,
  engine · explorer    studies · sessions   proprietary)
       └───────── CheckMate Core (this repo, AGPL) ──┘   ◄── /api/v1 ──
```

| Truth layer | Package / service | Never |
|---|---|---|
| Rules | `packages/chess` (chessops) | implemented anywhere else |
| Analysis | `AnalysisProvider` (browser Stockfish now) | called except through the interface |
| Knowledge/Data | `packages/core` (Postgres) + `services/explorer` + `services/tablebase` (Syzygy, 2026-10-11-06) | invented or estimated |

## Repository layout

```
apps/web          Next.js 16: pages, <Board>, /api/v1 route handlers, server
                  actions, browser Stockfish provider (Web Worker)
apps/worker       Node 24: pg-boss consumers (imports, sync, puzzle load,
                  explorer ingestion, position indexing, rebuild jobs)
packages/chess    Pure TS, no I/O. Rules facade over chessops, PGN/FEN,
                  positionKey, gameFingerprint, opening classifier,
                  TreeCursor, AnalysisProvider types + interface
packages/core     Drizzle schema + migrations, domain services, ExplorerSource
                  adapters, user-scoped query helpers. No React/Next imports.
services/explorer Compose config + ingestion config for lila-openingexplorer
                  (Phase 2). No forked upstream code.
services/tablebase Dockerfile building upstream lila-tablebase at a pinned
                  commit; Syzygy files on a read-only volume (Phase 1,
                  2026-10-11-06-self-hosted-syzygy-tablebase). No forked code.
```

Requirements:
- **CORE-01 MUST** Dependency direction `packages/chess` ← `packages/core` ← `apps/*`; enforced by ESLint `no-restricted-imports` per-folder overrides, plus a `packages/chess` tsconfig with no DOM `lib` and `types: []` for CORE-02 (2026-10-11-01-eslint-prettier-enforce-boundaries).
- **CORE-02 MUST** `packages/chess` has no I/O, no DOM, no Node APIs — importable by browser, server, worker.
- **CORE-03 MUST** Apps access the DB only via `packages/core` services.
- **CORE-04 MUST** No LLM SDKs, prompts or coaching logic anywhere in this repo.

## Rules layer (`packages/chess`)

Exports (names indicative):
- `parseFen`, `makeFen`, `validateSetup(fen) → {ok} | {ok:false, reasons[]}`
- `legalDests(position)` (chessground format), `applyUci`, `applySan`, `toSan`
- `parsePgn(text) → Game[]` (streaming variant for large files), `makePgn(game)`
- `gameStatus(position) → ongoing | checkmate | stalemate | insufficient | ...`
- `positionKey(position)` — normalized EPD (2026-10-10-15-personal-opening-tree-as-derived-postgres-index)
- `gameFingerprint(game)` — SHA-256 of normalized white/black names, date, result and the UCI move list. Used **only** for P3 PGN-upload dedup within one user's library.
- `terminalKey(game)` — `positionKey(final position)` + game year. The OTB/masters dedup key, matching upstream lila-openingexplorer (2026-10-10-19-curated-masters-set-deduped-by-terminal-position).
- `classifyOpening(positionKey) → {eco, name} | null` over lichess-org/chess-openings (CC0) `epd` table; `classifyLine(moves) → deepest classified ancestor`.
- `TreeCursor` — game tree + path-based cursor (lila-style paths), mutation ops (add move, promote, delete, set comment/NAG/shapes), serializes to PGN.

- **CORE-10 MUST** Any feature needing a chess answer uses these exports; no feature re-derives legality, mate, or opening names.
- **CORE-11 MUST** Unit tests cover `positionKey` (ep normalization, castling), `gameFingerprint` (name normalization, determinism), `terminalKey`, `classifyLine`, PGN round-trip on the fixture corpus.

## Analysis layer: `AnalysisProvider`

```ts
interface AnalysisProvider {
  readonly id: string;                        // 'browser-stockfish'
  engines(): Promise<EngineInfo[]>;           // available flavors
  analyzePosition(fen: string, opts: AnalyzeOpts): AnalysisStream; // incremental snapshots, cancel()
  getBestMoves(fen: string, opts: { multiPv: number; depth?: number; movetimeMs?: number }): Promise<EngineLine[]>;
  evaluateLine(fen: string, uci: string[], opts: EvalOpts): Promise<PlyEval[]>;  // eval after each ply
  validateVariation(fen: string, uci: string[], opts: EvalOpts): Promise<VariationCheck>;
}
type Score = { kind: 'cp' | 'mate'; value: number; pov: 'white' };
type EngineLine = { multiPv: number; depth: number; selDepth?: number; nodes: number; score: Score; pv: string[] /* UCI */ };
type Provenance = { provider: string; engine: string; version: string; flavor: string;
                    depth: number; nodes: number; computedAt: string; where: 'browser' | 'server' };
type VariationCheck = { legal: true; evals: PlyEval[] } | { legal: false; firstIllegalPly: number; reason: string };
```

- **CORE-20 MUST** `validateVariation` checks legality via the rules layer first; the engine is only asked about legal lines.
- **CORE-21 MUST** Every result object carries `Provenance`.
- **CORE-22 MUST** Only the provider implementation imports `stockfish` or parses UCI output (2026-10-10-09-browser-stockfish-behind-analysis-provider).
- **CORE-23 SHOULD** A fake provider (deterministic canned lines) exists for tests and Storybook-style previews. *(2026-10-11: build in M1.1.)*

## Knowledge/Data layer: `ExplorerSource`

```ts
interface ExplorerSource {
  id: 'lichess' | 'masters' | 'lichess-account' | 'me' | string;
  label: string;
  attribution?: string;                                   // e.g. CC BY-SA notice
  capabilities: { ratings: boolean; speeds: boolean; dateRange: 'month' | 'year' | 'day' | null;
                  color: boolean; platform: boolean; perspective: 'white' | 'user' };
  getPositionStats(fen: string, filters: ExplorerFilters, ctx: { userId?: string }): Promise<PositionStats>;
}
type MoveStat = { uci: string; san: string; games: number; white: number; draws: number; black: number;
                  averageRating?: number; opening?: { eco: string; name: string } };
type PositionStats = { source: string; total: { games: number; white: number; draws: number; black: number };
                       moves: MoveStat[]; topGames?: GameRef[]; recentGames?: GameRef[];
                       excludedBecause?: string };  // set when a filter can't be honoured
```

- **CORE-30 MUST** When an active filter is unsupported by a source, that source returns `excludedBecause` and is left out of any union; the UI shows why. Never silently ignore a filter.
- **CORE-31 MUST** The `me` source reports W/D/L from the user's perspective (`perspective: 'user'`); others from White's.
- **CORE-32 MUST** Adding a source = one adapter in `packages/core` + registry entry; the explorer UI renders any source from `capabilities` without code changes.

## Core HTTP API (`/api/v1`)

- **CORE-40 MUST** JSON REST under `/api/v1/...`, inputs validated with zod, outputs typed from shared schemas.
- **CORE-41 MUST** Error envelope `{ "error": { "code": "PGN_PARSE_ERROR", "message": "...", "details": {...} } }`; HTTP status matches class (400 validation, 401, 403, 404, 409 version conflict, 429, 5xx).
- **CORE-42 MUST** Domain services take an explicit `userId` argument; route handlers resolve it from the session. Phase 4 will add service-to-service auth that resolves `userId` differently — no service may read cookies itself.
- **CORE-43 SHOULD** Each endpoint is documented in the feature spec that introduces it; an OpenAPI document is generated before Phase 4 starts. *(2026-10-11: confirmed. Specs as features land, OpenAPI at P4-prep.)*
- **CORE-44 COULD (P4-prep)** Rules endpoints (`/api/v1/chess/legal-moves`, `/validate-line`) as thin wrappers over `packages/chess` — not built in Phases 1-3 (confirmed 2026-10-11).

## Data ownership and authz

- **CORE-50 MUST** Every user-owned table has a non-null `user_id` FK with `ON DELETE CASCADE`.
- **CORE-51 MUST** `packages/core` exposes queries that require `userId`; there is no unscoped accessor for user tables. The one sanctioned non-owner path is the studies `studyAccess(userId | null, studyId)` gate (public, unlisted and member access, 2026-10-11-04-shared-collaborative-studies-ops-over-pgn). Every study query goes through it, and "none" answers 404.
- **CORE-52 MUST** Every feature's test suite includes a cross-user access test (user B cannot read or mutate user A's rows; returns 404, not 403, to avoid leaking existence).
- **CORE-53 MUST** Raw tables follow 2026-10-10-11 (append-only + derived rebuild jobs).

## Jobs

- **CORE-60 MUST** All long-running work (imports, sync, PGN files > 1 MB, puzzle DB load, explorer ingestion, reindex) runs in `apps/worker` via pg-boss; the web request only enqueues and returns a run id.
- **CORE-61 MUST** Jobs are idempotent (safe to retry) and record progress in a domain table: `import_runs` (per-user, P3 spec) or `ingestion_runs` (system datasets, below).

```
ingestion_runs (id uuid PK, dataset text,  -- 'puzzles' | 'explorer-lichess' | 'explorer-otb:<source>'
  source_ref text,                          -- file URL / month / version
  status text, started_at, finished_at,
  rows_seen int, rows_inserted int, rows_updated int, rows_skipped int,
  error text null, details jsonb)
```

## Variants

- **CORE-70 MUST** MVP UI supports standard chess only. Imported non-standard games (e.g. Chess960 from Chess.com/Lichess) are stored raw with `variant` set and excluded from trees, explorer and analysis-board import (with a visible notice).

## Phase 4 readiness checklist (brief §8)

| Brief requirement | Satisfied by |
|---|---|
| Board state independent of UI | `TreeCursor` in `packages/chess` (2026-10-10-08-single-chessground-board-component) |
| Dedicated rules layer | `packages/chess` (CORE-10) |
| Engine via reusable service interface | `AnalysisProvider` (CORE-20..23) |
| Game data retrievable programmatically | `/api/v1/games` (P3 specs) + CORE-42 |
| Explorer data via backend services | `/api/v1/explorer` + `ExplorerSource` |
| Personal stats via structured APIs | `/api/v1/opening-tree`, `/api/v1/puzzles/history` |
| Consistent analysis data structures | `Score`, `EngineLine`, `Provenance` |
| Multiple engines later | provider registry; `engine` in `Provenance` |

## Testing strategy

- Vitest: `packages/chess` (heavy), `packages/core` services against a real Postgres (the compose `postgres` service, locally and in CI), API handlers.
- Playwright: each phase's deliverables as end-to-end scenarios (see 2026-10-10-mvp-roadmap.plan.md).
- Fixture corpus in `packages/chess/fixtures/`: Lichess study export, Lichess game export, Chess.com monthly archive PGN, broadcast round, malformed PGNs.

## Acceptance criteria

- Lint fails if `apps/web` imports a DB client or `packages/chess` imports Node/DOM APIs.
- A test provider can replace browser Stockfish in the analysis board with no UI code change.
- A new dummy `ExplorerSource` appears in the explorer UI after registering it, with no UI change.

## Open questions

- OpenAPI generation tool (zod-to-openapi vs hand-written) — decide at P4-prep; not blocking.
