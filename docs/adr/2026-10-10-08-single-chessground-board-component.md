# One chessground-based board component for the whole app

Date: 2026-10-10
Status: Accepted

## Decision

Every board in CheckMate is the one React component `<Board>`. It is our own
thin wrapper over `@lichess-org/chessground` 10.x (GPL-3.0-or-later). Board
*state* (game tree, current path, orientation) lives outside React
components, in a framework-free `TreeCursor` in `packages/chess`, and is
exposed to React through a hook. Legal destinations always come from the rules
layer (2026-10-10-07-chessops-is-the-rules-layer).

## Context

The brief requires one reusable board shared by analysis, editor, puzzles,
studies, explorer and game viewer, with chessground's interaction quality
(drag/click moves, premove-free analysis, arrows, highlights, animations).
Phase 4 needs board state that can be read without the UI.

Checked 2026-10-10: `@react-chess/chessground` pins chessground 8.3.5 and
React ≤18. Wrapping chessground with a ref plus `useEffect` is the common
practice.

## Alternatives rejected

- **`@react-chess/chessground`** — stale; pins an old chessground and
  pre-React-19 peers.
- **react-chessboard (MIT)** — weaker interaction model; doesn't match
  Lichess UX parity.
- **Per-feature boards** — explicitly forbidden by the brief; duplicates
  bugs.
- **Board state in React component state** — not readable by Phase 4 and
  hard to test; lila keeps its tree outside the view too.

## Consequences

- Never mount chessground directly outside `<Board>`. New board features go
  into `<Board>` behind props.
- Board themes and piece sets are CSS classes, from the asset allowlist only
  (2026-10-10-04-license-core-agpl-3-or-later).
- Arrows and highlights round-trip to PGN `[%cal]/[%csl]` comments.
