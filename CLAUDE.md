# CheckMate

Open-source (AGPL) chess learning and analysis platform: analysis board,
editor, studies, themed puzzles, unified opening explorer, personal game
database. No AI in this repo.

## Commands

None yet. They arrive with the M1.0 scaffold (pnpm + Turborepo, see
docs/stream/2026-10-10-mvp-roadmap.plan.md).

## Hard rules

- Chess truth comes only from the rules layer, `AnalysisProvider`, or a
  cleared dataset. Never invent moves, evals, opening names or stats
  (adr/2026-10-10-02).
- All legality, FEN/PGN and SAN go through `packages/chess` (chessops). No
  hand-rolled move logic (adr/2026-10-10-07).
- Only `<Board>` imports chessground; board state lives in `TreeCursor`
  (adr/2026-10-10-08).
- Only the `AnalysisProvider` implementation imports `stockfish` or parses
  UCI. Never persist browser evals as truth (adr/2026-10-10-09).
- No LLM SDKs, prompts or coaching logic in this repo. The AI service uses
  `/api/v1` only (adr/2026-10-10-03).
- Register every new dependency, asset or dataset in
  docs/wiki/open-source-reuse.md **before** merging. Banned assets stay out
  (adr/2026-10-10-04).
- Raw player data is append-only. Aggregates are derived and rebuildable.
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
