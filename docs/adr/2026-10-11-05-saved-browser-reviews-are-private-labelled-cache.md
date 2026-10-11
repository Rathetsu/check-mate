# Saved browser game reviews are a private, labelled cache

Date: 2026-10-11
Status: Accepted. Refines 2026-10-10-09-browser-stockfish-behind-analysis-provider.

## Decision

When a user runs "Review game" (browser Stockfish over the mainline, M1.2b),
the result is saved **per user** in `game_reviews`. Each run is one
append-only row:
- `line_key`: SHA-256 of the initial FEN plus the mainline UCI
- provenance, depth, and per-ply eval, classification and best move
- a per-player summary

Reopening the same mainline, whether from analysis, a study chapter or an
uploaded PGN, shows the latest run. A picker lists earlier runs. "Re-run"
adds a new row.

Saved reviews are a cache of the user's own browser output, **not chess
truth**:
- Always shown labelled "Browser review · Stockfish 19 Lite · depth N ·
  date".
- Read only by the owner's review UI. Never used in stats, explorer data,
  datasets or `/api/v1` facts for other features.
- Deleted with the account.
- Phase 4 server analysis replaces them as the truth source.

The live engine panel is still never persisted (P1-AN-32).

## Context

The user (2026-10-11) wants a reviewed game to stay reviewed, without
re-running the engine on every visit. ADR 09 says browser evals are never
stored *as truth*. The point is that client-computed numbers must never become
shared facts. A private cache that is always labelled and never reused keeps
that rule.

## Alternatives rejected

- **Don't save (the original P1-AN-42)** — the user explicitly rejected it.
- **Overwrite one review per game** — the user wants older runs kept, for
  example to compare depth 18 with depth 24.
- **Feed reviews into stats or Phase 4** — that would make browser output
  truth.

## Consequences

- The `CLAUDE.md` hard rule gains a pointer to this ADR.
- A crafted client could save fake numbers. That's acceptable, because only
  the same user ever sees them.
- `game_reviews` is user-owned (CORE-50) and covered by the deletion tests.
