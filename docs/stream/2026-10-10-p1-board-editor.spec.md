# Spec: Board editor

Date: 2026-10-10
Status: Approved. Built in M1.3 (2026-10-11), except "Save as study chapter" (M1.4)
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
5. "Analyze" enables when the position is valid.

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
  Swap colors (COULD until 2026-10-11, now in Phase 1: every piece changes
  color, mirrored, and side to move flips).
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
- **P1-ED-10 MUST** "Analyze" (to `/analysis/<fen>`, with the tree root at
  this FEN) and "Save as study chapter" are disabled while invalid. A tooltip
  lists the reasons. "Save as study chapter" lands with M1.4, once studies
  exist. "Continue from here" is **won't do** (user decision 2026-10-11): in
  CheckMate it would open the same page as "Analyze". Lichess uses it for
  play modes CheckMate doesn't have.
- **P1-ED-11 MUST** URL stays in sync (`/editor/<fen>`) so positions are
  shareable, by replacing the history entry. Browser back/forward does
  **not** walk the edit history: **won't do** (user decision 2026-10-11; not
  planned for any phase).
- **P1-ED-12 SHOULD** Load a position from the current analysis node ("Open
  in editor"). *(2026-10-11: build; it is the same button as P1-AN-23.)*
- **P1-ED-13 SHOULD** Mobile: palette laid out as a scrollable row,
  tap-to-place. *(2026-10-11: build in Phase 1.)*

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

## Build notes

### M1.3 (2026-10-11)

- **`packages/chess/src/editor.ts`** holds the editor state (`EditorState`:
  placement, side to move, requested castling, en passant, counters) and
  writes its FEN. Castling availability and en passant candidates are
  adapted from lila `ui/editor/src/ctrl.ts` at `46d24871` and rewritten over
  chessops boards. Validity still comes only from `validateSetup`.
- **Requested vs. available castling:** a checkbox remembers what the user
  asked for, but a right goes into the FEN only while that king and rook
  stand at home (as lila does). An en passant square goes in only while it's
  a candidate.
- **Any parseable FEN opens** in the editor, valid or not, so it can be fixed
  there. Chess960 castling is refused with a message.
- **`<Board mode="free">`:** chessground free movement, drag off to delete,
  `onBoardChange` with the placement, `onSquareClick` for the tools, and a
  `ref` handle with `dragNewPiece` so the palette never imports chessground.
  Touches on the editor board never scroll the page.
- **Palettes** show the pointer, six pieces and the eraser. With the pointer,
  pressing a piece drags a new one in; clicking or tapping it makes it the
  sticky piece. On phones this is tap-to-place (P1-ED-13).
- **Analyze** is a full page load (the analysis board is cross-origin
  isolated). The analysis board's "Open in editor" (P1-AN-23) sits with the
  board controls.
- **Tests:** a 20-setup availability table, FEN writing, counters,
  swap-colors round trips, `placePiece`; Playwright: the spec flow, the
  round trip through analysis, drag in and drag off, castling, en passant,
  each invalid-FEN reason, swap colors, and tap-to-place at 375 px.
