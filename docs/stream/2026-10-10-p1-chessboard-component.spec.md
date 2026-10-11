# Spec: Chessboard component and game-tree state

Date: 2026-10-10
Status: Approved (design; no code yet)
Phase: 1 · Milestone M1.1

## Goal

Build one reusable `<Board>` React component (chessground) and one
UI-independent game-tree state model (`TreeCursor`). Every board feature in
CheckMate is built on these two.

Decisions: 2026-10-10-08-single-chessground-board-component ·
2026-10-10-07-chessops-is-the-rules-layer.

## Scope

In: the board wrapper, move input, promotion, arrows and highlights, flip,
coordinates, animation, resize, themes, `TreeCursor`, `useGameTree`, move
navigation.
Out: the move-list UI and engine UI (analysis spec), the editor's free mode
(editor spec, which reuses `<Board>` with `mode="free"`).

## `<Board>` contract

Props (indicative):

| Prop | Type | Notes |
|---|---|---|
| `fen` | string | Rendered position |
| `orientation` | `'white' \| 'black'` | |
| `turnColor` | color | |
| `dests` | `Map<Square, Square[]>` | **Always** from `legalDests()` in `packages/chess`; empty or absent = no moves |
| `lastMove` | `[Square, Square]?` | Highlight |
| `check` | `boolean \| color` | From the rules layer |
| `shapes` | `Shape[]` | Arrows and circles (user-drawn plus auto, e.g. engine best move) |
| `autoShapes` | `Shape[]` | Not user-editable (engine, explorer hover) |
| `mode` | `'play' \| 'view' \| 'free'` | `free` = editor (no legality) |
| `onMove` | `(uci) => void` | Promotion already resolved |
| `onShapesChange` | `(shapes) => void` | |
| `movable` | `'both' \| color \| 'none'` | Puzzles restrict to one side |
| `coordinates`, `animationMs`, `pieceSet`, `boardTheme` | from preferences | |

## Requirements

- **P1-BD-01 MUST** Drag-and-drop and click-to-move, both enabled by default.
  The user can restrict to one (preference).
- **P1-BD-02 MUST** Legal-move dots and capture rings come from `dests`.
  Illegal moves snap back and never reach `onMove`.
- **P1-BD-03 MUST** Promotion picker overlay: queen, rook, bishop, knight,
  and cancel. Keyboard accessible.
- **P1-BD-04 MUST** Smooth move animations, disabled under reduced motion.
- **P1-BD-05 MUST** Flip board (button and `f`). Coordinates on or off.
- **P1-BD-06 MUST** Arrows and circles:
  - Draw with right-click drag, in four colors by modifier key.
  - Shapes map 1:1 to PGN `[%cal]` / `[%csl]` (G/R/Y/B).
- **P1-BD-07 MUST** Responsive sizing: square board fills its container.
  chessground redraws on container resize (ResizeObserver).
- **P1-BD-08 MUST** Board themes and piece sets switch via CSS classes with
  no remount.
- **P1-BD-09 MUST** No premoves (analysis-first app). Premove UI is disabled.
- **P1-BD-10 MUST** A11y: a hidden live region announces the last move in
  SAN. A keyboard move-input field (type SAN or UCI) is offered as an
  alternative to dragging.
- **P1-BD-11 MUST** Only `<Board>` may import chessground. Enforced by a lint
  rule.

### `TreeCursor` (packages/chess) and `useGameTree` (apps/web)

- **P1-BD-20 MUST** Tree of nodes `{id, ply, uci, san, fen, positionKey, comments[], nags[], shapes[], clock?, importedEval?, children[]}`. `children[0]` is the mainline.
- **P1-BD-21 MUST** Paths are strings of node ids from the root (lila-style).
  A cursor holds the current path.
- **P1-BD-22 MUST** Operations:
  - `play(uci)` follows an existing child, or adds a new child and returns
    its path
  - `goto`, `next`, `prev`, `first`, `last`, `nextVariation`,
    `prevVariation`
  - `promoteVariation`, `makeMainline`, `deleteFrom(path)`
  - `setComment`, `toggleNag`, `setShapes`
- **P1-BD-23 MUST** `fromPgn(game)` / `toPgn()` through chessops, preserving
  everything listed in the PGN/FEN spec.
- **P1-BD-24 MUST** Pure and serializable. No React inside `packages/chess`.
  `useGameTree` subscribes React to cursor changes.
- **P1-BD-25 MUST** Keyboard navigation per P1-UI-04, scoped to the focused
  board page.

## Consumers

These features must all use `<Board>` and `TreeCursor`:
- analysis board
- studies
- puzzles (`movable` restricted, tree used for the solution line)
- board editor (`mode="free"`)
- explorer (P2)
- game viewer (P3)

## Reuse

| Component | Mode |
|---|---|
| `@lichess-org/chessground` 10.x | reused |
| chessops `compat.chessgroundDests` | reused |
| lila tree/path model | adapted (design only, re-implemented in TS over chessops) |
| React wrapper | independent |

## Chess-authority notes

The board never decides legality. `dests` and `check` come only from the
rules layer.

## Phase 4 hooks

`TreeCursor` serializes the exact position, the line, and the user's
annotations. The AI service receives these through the API, not by scraping
the UI.

## Acceptance criteria

- Unit: `TreeCursor` operations on fixture trees (promote, delete, then
  round-trip to identical PGN).
- Playwright on the analysis page:
  - drag e2-e4 works
  - illegal e2-e5 snaps back
  - click-move works
  - promoting to a knight works
  - drawing an arrow, exporting the PGN, and re-importing it gives the same
    arrow
  - flip works
  - ←/→ navigate
- Resize from 375px to 1440px: the board stays square with no overflow.
- Lint: importing chessground outside `<Board>` fails.

## Open questions

None.

## Build notes (M1.1, 2026-10-11)

- **Board:** `apps/web/src/components/board/Board.tsx`.
  - chessground observes its own resizes, so the wrapper only gives the
    mount `aspect-ratio: 1`. The `coordinates` preference remounts the
    board, since chessground reads it only when created. Everything else
    switches by `set` or CSS class.
  - Coordinates sit inside the edge squares. chessground's default shifts
    the file labels 24px past the board, which scrolled phones sideways.
  - Promotion follows lila's `promotion.ts` pattern: an overlay after the
    pawn lands. Escape cancels from anywhere, and the position is restored.
  - Board themes are CSS `repeating-conic-gradient`s.
  - Piece CSS is generated by `scripts/gen-piece-css.ts` from the sets that
    `scripts/fetch-lila-assets.sh` copies (lila at a pinned commit).
- **Piece sets: 11, not 12.** `staunton` was dropped. lila's
  `public/images/staunton` holds only 3D-board sprites, and the 2D set
  `staunty` is CC BY-NC-SA (banned).
- **`TreeCursor`** (`packages/chess/src/tree.ts`):
  - Node ids are chessops `scalachessCharPair` after `normalizeMove`, so
    `O-O`, e1g1 and e1h1 share one id.
  - Mutations throw `ChessError` with `ILLEGAL_MOVE`, `NODE_GONE` or
    `TOO_LARGE`.
  - PGN can only put a comment before a variation's first move. When a node
    becomes the mainline move (promote, delete), its leading comments move
    onto the parent, where a re-parse would put them. Browser and server
    trees therefore stay identical.
  - `promote(path, toMainline)` covers both `promoteVariation` and
    `makeMainline`.
- **React:** `useGameTree` re-renders after each cursor call. The cursor
  stays plain data.
