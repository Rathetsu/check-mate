# Store study chapters as PGN text

Date: 2026-10-10
Status: Accepted

## Decision

A study chapter's content is one PGN text column holding:
- headers
- mainline and variations
- comments
- NAGs
- arrows and highlights as `[%cal]` / `[%csl]` comment commands, the Lichess
  convention

PGN is the single serialization. It is parsed and written by the rules layer
(2026-10-10-07-chessops-is-the-rules-layer). Edits save the whole chapter,
with an integer `version` check for optimistic concurrency. Chapter metadata
(name, order, orientation) lives in normal columns.

## Context

Studies are private and single-user in the MVP. Collaborative editing is
explicitly deferred. PGN import and export are required everywhere. chessops
parses PGN into a tree and writes it back, keeping variations, comments,
NAGs and shapes.

## Alternatives rejected

- **JSON node tree in the DB (lila-style)** — a second serialization that
  must stay in sync with PGN for import and export. Only worth it once
  per-node collaborative edits exist.
- **Node-per-row table** — heavy writes for every move added; no MVP query
  needs per-node SQL.

## Consequences

- Export is a copy of the stored text plus headers. Import is validated
  through chessops before saving, so invalid PGN never reaches the DB.
- Concurrent edits from two tabs are detected by the `version` check (the
  later save gets a conflict). There is no merging.
- If collaborative or public studies arrive, supersede this ADR with a
  per-node model.
- Phase 4 reads chapters through Core's API and gets PGN, which any consumer
  can parse.
