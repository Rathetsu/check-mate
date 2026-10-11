# chessops is the rules layer

Date: 2026-10-10
Status: Accepted

## Decision

All legality checks, move generation, move application, game termination,
SAN/UCI, FEN parse/write, setup validation and PGN parse/write go through
`chessops` (niklasf, GPL-3.0-or-later, v0.15.x). It is wrapped by
`packages/chess`, which adds CheckMate helpers (position key, game
fingerprint, opening classifier, tree cursor). No other code implements
chess rules.

## Context

Verified 2026-10-10 in chessops source:
- `Position.validate()` and `IllegalSetup` give setup validation with
  reasons.
- The PGN parser keeps the full tree: variations as `children`, comments, and
  NAGs. It parses `[%eval]`, `[%clk]` and `[%cal]/[%csl]` shapes, and streams
  multi-game files.
- `chessops/compat` produces chessground move destinations.

Lichess uses chessops in production, and so do chessground and pgn-viewer.
It has no Zobrist/polyglot hash module.

## Alternatives rejected

- **chess.js (BSD-2)** — its grammar parses variations, but `loadPgn` walks
  only the mainline and throws side variations away. That breaks studies,
  the analysis tree and PGN import, all of which the brief requires.
- **chess.js in the browser plus another library on the server** — two rules
  authorities that can disagree.
- **Writing our own move generator** — reinventing mature, fuzz-tested code.

## Consequences

- The board gets its legal destinations from `packages/chess` (via
  `chessops/compat`), never from ad hoc logic.
- The Phase 4 AI service cannot use chessops (GPL). It asks Core for rules
  answers (2026-10-10-03-separate-open-source-core-from-proprietary-ai-service).
- Position keys are normalized EPD strings, not hashes
  (2026-10-10-15-personal-opening-tree-as-derived-postgres-index).
- MVP supports standard chess only. chessops can do variants, but variant
  games are stored raw and excluded from trees and the explorer.
