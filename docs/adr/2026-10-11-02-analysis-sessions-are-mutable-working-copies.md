# Analysis sessions are mutable working copies

Date: 2026-10-11
Status: Accepted

## Decision

An `analysis_sessions` row is the user's current working copy of an analysis
tree, not a raw event. Autosave overwrites its `pgn`, `last_position_key` and
`updated_at` (P1-AN-31). No revision history is kept.

This narrows 2026-10-10-11-raw-player-data-append-only-aggregates-derived,
which listed analysis sessions as append-only raw data. Everything else in
that ADR stands: imported games, puzzle attempts and their move rows, import
runs and import failures stay append-only.

## Context

P1-AN-31 already specified overwriting the PGN every 5 seconds, which
contradicted ADR 11. The user chose the working-copy model (2026-10-11).
A deleted variation is usually something the user meant to discard.

## Alternatives rejected

- **A revision row per autosave** — keeps every line ever tried, but storage
  grows with every edit and needs its own retention rule.
- **Overwrite, plus a snapshot when the session closes** — a middle ground
  with more code and no current consumer.

## Consequences

- Phase 4 sees each session's final tree, not its edit history.
- Purging stale free-analysis sessions (P1-AN-33) is ordinary cleanup, not an
  exception to append-only.
- Engine evaluations are still never stored (P1-AN-32).
- If Phase 4 needs edit history, supersede this ADR with a revision table.
