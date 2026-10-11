# Spec: Board editor

Date: 2026-10-10
Status: Approved (design; no code yet)
Phase: 1 · Milestone M1.3

## Goal

Lichess-equivalent position setup. Users place or remove pieces freely, set
the side to move, castling, en passant and counters, and import or export
FEN. They can open the position in the analysis board only when the rules
layer says it is valid.

Decisions: 2026-10-10-07-chessops-is-the-rules-layer ·
2026-10-10-08-single-chessground-board-component.

## Scope

In: free piece placement, spare-piece palette, clear/start/flip, side to
move, castling, en passant, counters, FEN in/out, validation, open in
analysis, save as study chapter.
Out: variant setups (Chess960, Crazyhouse pockets), image-to-FEN
recognition.

## User flow

`/editor` (or `/editor/<fen>`), then:
1. Drag pieces from the palette or around the board; drag off the board to
   delete.
2. Set options in the side panel.
3. The FEN field updates live, and pasting a FEN updates the board.
4. Validation reasons appear inline as the user edits.
5. "Analyze" and "Continue from here" enable when the position is valid.

## Requirements

- **P1-ED-01 MUST** `<Board mode="free">` with spare-piece palettes above and
  below, matching orientation.
- **P1-ED-02 MUST** Palette tools:
  - **Pointer/move** (default).
  - **Sticky piece:** click a palette piece, then click squares to place it
    repeatedly.
  - **Eraser:** click squares to clear them.
  - Dragging a piece off the board deletes it.
- **P1-ED-03 MUST** Actions: Clear board, Starting position, Flip board,
  Swap colors (COULD).
- **P1-ED-04 MUST** Side to move: White / Black.
- **P1-ED-05 MUST** Castling:
  - Four checkboxes (White O-O, White O-O-O, Black O-O, Black O-O-O).
  - Each is **enabled only when** the king and that rook stand on their home
    squares. Unavailable rights are unchecked and disabled automatically when
    pieces move.
- **P1-ED-06 MUST** En passant:
  - A selector lists only squares where an en passant capture would be
    pseudo-legal for the side to move, given the board.
  - The selector is empty otherwise.
- **P1-ED-07 MUST** Halfmove clock (0-150) and fullmove number (≥1) inputs.
- **P1-ED-08 MUST** FEN text field, two-way bound. Invalid pasted FEN shows
  the parse error and leaves the board unchanged.
- **P1-ED-09 MUST** Validation via `validateSetup` lists every reason:
  - missing or extra king
  - side not to move is in check
  - pawn on the 1st or 8th rank
  - too many pieces
  - inconsistent castling or en passant
- **P1-ED-10 MUST** "Analyze" (to `/analysis/<fen>`), "Continue from here"
  (same, with the tree root at this FEN), and "Save as study chapter" are
  disabled while invalid. A tooltip lists the reasons.
- **P1-ED-11 MUST** URL stays in sync (`/editor/<fen>`) so positions are
  shareable. Browser back/forward walks the edit history (COULD) or at least
  the last committed FEN.
- **P1-ED-12 SHOULD** Load a position from the current analysis node ("Open
  in editor").
- **P1-ED-13 SHOULD** Mobile: palette laid out as a scrollable row,
  tap-to-place.

## Reuse

| Component | Mode |
|---|---|
| `<Board>` free mode (chessground `movable.free`, spare pieces via drag API) | reused |
| lila `ui/editor` castling/ep inference logic | adapted (AGPL; header attribution in the file) |
| chessops `setup`, `fen` validation | reused |
| Editor UI | independent |

## Chess-authority notes

The editor has no legality rules of its own. The castling and en passant
options shown are derived from the rules layer's evaluation of the setup.
Validity is decided only by `validateSetup`.

## Phase 4 hooks

None specific. Positions created here flow into analysis and studies as FEN.

## Acceptance criteria

- Unit: castling and en passant availability tables for 20 fixture setups
  (e.g. king moved off e1 disables both White rights; an en passant square is
  offered only after a double-push configuration).
- Playwright:
  - clear → place two kings and a pawn on the 8th rank → error shown and
    Analyze disabled
  - move the pawn to the 7th rank → Analyze enabled → the analysis board opens
    with an identical FEN
- Pasting each invalid FEN fixture shows its specific reasons.
- The round trip editor → analysis → "Open in editor" preserves the FEN
  exactly.

## Open questions

None.
