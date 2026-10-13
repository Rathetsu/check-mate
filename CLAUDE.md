# CheckMate

Open-source (AGPL) chess learning and analysis platform: analysis board,
editor, studies, themed puzzles, unified opening explorer, personal game
database. No AI in this repo.

## Commands

Node 24 (`.nvmrc`), pnpm via corepack (`corepack enable`). Copy `.env.example`
to `.env` first.

- `docker compose --profile dev up -d postgres mailpit`: local DB and email
  catcher (Mailpit UI on :8025)
- `pnpm db:migrate`: apply migrations. `pnpm db:generate` writes a new one
  after a schema change in `packages/core/src/schema/`
- `pnpm dev`: web on :3000 plus the worker
- `pnpm lint` · `pnpm format:check` · `pnpm typecheck`
- `pnpm test`: Vitest. Uses a separate `checkmate_test` database
- `pnpm e2e`: Playwright (needs postgres + mailpit). Add `PW_CHANNEL=chrome`
  to use a local Chrome
- `pnpm check:register`: register, license and LLM checks. `pnpm
register:write` regenerates `NOTICE` and the `/about` data
- `docker compose --profile dev up --build`: full stack behind Caddy at
  https://localhost
- `scripts/fetch-lila-assets.sh` then `node scripts/gen-piece-css.ts`:
  re-copy the allowlisted piece and sound sets from lila (pinned commit) and
  regenerate the piece CSS. Both outputs are committed
- `node scripts/gen-openings.ts`: regenerate
  `packages/chess/src/data/openings.json` from chess-openings (pinned
  commit). Committed
- `node scripts/gen-mascot.ts`: rebuild the served mascot poses in
  `apps/web/public/brand/` from the masters in `apps/web/brand/`. Committed
- Stockfish: `pnpm install` copies the WASM builds into
  `apps/web/public/engine/` (gitignored) via `scripts/copy-stockfish.ts`
- Tablebase (optional): `scripts/fetch-tablebases.sh` (3-5 pieces, ~938
  MiB; `ci` for KRvK and KQvK only), then start the `tablebase` compose
  service with `--profile tablebase`. `pnpm e2e` expects it on :9000
- `pnpm e2e` runs the real engine in some tests;
  `LONGTASK_SECONDS=60 pnpm e2e -g "long tasks"` is the full long-task check

Workspace packages ship TypeScript source; nothing is compiled
(adr/2026-10-11-07). Relative imports use `.ts` extensions, and enums and
parameter properties are not allowed (`erasableSyntaxOnly`).

## Hard rules

- Chess truth comes only from the rules layer, `AnalysisProvider`, or a
  cleared dataset. Never invent moves, evals, opening names or stats
  (adr/2026-10-10-02).
- All legality, FEN/PGN and SAN go through `packages/chess` (chessops). No
  hand-rolled move logic (adr/2026-10-10-07).
- Only `<Board>` imports chessground; board state lives in `TreeCursor`
  (adr/2026-10-10-08).
- Only the `AnalysisProvider` implementation imports `stockfish` or parses
  UCI. Never persist browser evals as truth (adr/2026-10-10-09). Saved game
  reviews are a private, labelled, per-user cache, never truth
  (adr/2026-10-11-05).
- No LLM SDKs, prompts or coaching logic in this repo. The AI service uses
  `/api/v1` only (adr/2026-10-10-03).
- Register every new dependency, asset or dataset in
  docs/wiki/open-source-reuse.md **before** merging. Banned assets stay out
  (adr/2026-10-10-04).
- Raw player data is append-only (analysis sessions are mutable working
  copies, adr/2026-10-11-02). Aggregates are derived and rebuildable.
  Every player row has `user_id`, and all access is user-scoped via
  `packages/core` (adr/2026-10-10-11).
- Chess.com data never enters shared stats or datasets. Import only
  user-linked usernames, behind `CHESSCOM_IMPORT_ENABLED` (adr/2026-10-10-14,
  adr/2026-10-10-18).
- Release gate: the compliance checklist in docs/wiki/open-source-reuse.md
  must pass before any public deploy (adr/2026-10-10-17).
- Apps never query the DB directly. Use `packages/core`, and
  `packages/chess` has no I/O (adr/2026-10-10-05).
- Long-running work runs in `apps/worker` jobs, never in a request
  (CORE-60).
- Doc gate: a task isn't done until affected wiki pages are rewritten, ADRs
  are written for decisions, and this file and `docs/wiki/status.md` are
  synced.

## Where things are

- Docs map (read first for structural work): docs/index.md
- Current architecture: docs/wiki/architecture.md
- Decisions: docs/adr/ · Specs and plans: docs/stream/ (not docs/specs/)
- Phase 1 build order and per-milestone checks:
  docs/stream/2026-10-11-phase-1-implementation.plan.md
