# Spec: Analysis board and engine analysis

Date: 2026-10-10
Status: Approved (design; no code yet)
Phase: 1 · Milestones M1.2 (board + engine) and M1.2b (browser game review)

## Goal

A Lichess-grade analysis board. Users explore freely, build variation trees,
annotate, load and export PGN/FEN, and get Stockfish evaluations in the
browser. The engine never blocks the UI.

Decisions: 2026-10-10-09-browser-stockfish-behind-analysis-provider ·
2026-10-10-08-single-chessground-board-component ·
2026-10-10-11-raw-player-data-append-only-aggregates-derived.
Contracts: `AnalysisProvider` and `TreeCursor` (core-architecture spec,
chessboard spec).

## Scope

In: free exploration, variation tree, move list, annotations, engine panel,
PGN/FEN load and export, share links, save to study, analysis sessions,
browser game review (SHOULD).
Out: server-side analysis (Phase 4), cloud evals, tablebase lookup (COULD
later; Lichess tablebase API is still anonymous but may change), opening
explorer panel (P2 adds it as a tab).

## User flows

1. Open `/analysis` → starting position → make moves → variations branch
   automatically.
2. Paste PGN or FEN (or open a file) → pick a game if the PGN has several →
   navigate.
3. Toggle the engine (`x`) → eval bar plus N lines appear → click a PV move
   to play it into the tree.
4. Right-click a move → promote, make mainline, delete from here, copy PGN
   from here.
5. Annotate: choose a NAG glyph, write a comment, draw arrows.
6. Export, or "Save to study" (choose a study and chapter name).

## Requirements

### Tree and move list

- **P1-AN-01 MUST** Moves played from any node add a variation, or follow an
  existing child (`TreeCursor.play`).
- **P1-AN-02 MUST** Move list:
  - interleaved mainline with inline, indented variations (Lichess style)
  - collapsible variations
  - the current move is highlighted and scrolled into view
  - move numbers are correct after a black-to-move FEN
- **P1-AN-03 MUST** Context actions: promote variation, make mainline, delete
  from here, copy PGN of the line.
- **P1-AN-04 MUST** Annotations:
  - **Move NAGs:** `!`, `?`, `!!`, `??`, `!?`, `?!`.
  - **Position NAGs:** `=`, `∞`, `⩲`, `⩱`, `±`, `∓`, `+-`, `-+`.
  - **Comments:** one per node.
  - All are shown inline in the move list.
- **P1-AN-05 MUST** Arrows and highlights persist per node and are exported
  as `[%cal]/[%csl]`.
- **P1-AN-06 MUST** Game status shown when the rules layer reports it
  (checkmate, stalemate, insufficient material, threefold, fifty-move).
- **P1-AN-07 MUST** Opening name for the current line comes from
  `classifyLine`. It shows nothing when unclassified (2026-10-10-02).

### Engine

- **P1-AN-10 MUST** Engine toggle, defaulting to the user preference. The
  engine starts only when shown, and stops when the panel is hidden or the tab
  is backgrounded.
- **P1-AN-11 MUST** Eval bar plus numeric eval (`+1.3`, `#-4`), from White's
  point of view.
- **P1-AN-12 MUST** MultiPV 1-5 lines, each showing:
  - score
  - depth
  - SAN principal variation, truncated with "…"
  - Hovering a line shows an arrow. Clicking a move plays it into the tree.
- **P1-AN-13 MUST** Settings:
  - depth limit (16-40, or infinite)
  - lines (1-5)
  - threads (multi-threaded builds only; default `hardwareConcurrency − 1`,
    max 8)
  - hash (16-256 MB)
  - engine flavor (Lite default, or Full NNUE with a ~94 MB download warning
    and progress bar)
- **P1-AN-14 MUST** Best-move arrow on the board (toggleable).
- **P1-AN-15 MUST** Provenance label, e.g. "Stockfish 19 · Lite NNUE · depth
  24 · 1.2 Mn/s · browser".
- **P1-AN-16 MUST** Navigating to another node cancels the running search
  within 100 ms and starts a new one. Results from a stale node are never
  shown.
- **P1-AN-17 MUST** If the engine fails to load (no WASM, out of memory), the
  board stays fully usable and an error state explains why.
- **P1-AN-18 MUST** The game-over states (mate, stalemate) come from the
  rules layer, not the engine.

### Load / export / share

- **P1-AN-20 MUST** Load via paste, file and URL (`/analysis/<fen>`) using
  the PGN/FEN spec. A multi-game PGN shows a game picker.
- **P1-AN-21 MUST** Export PGN, export FEN, copy share link. The link
  encodes the FEN of the current node. A full-PGN link is COULD (size
  limits).
- **P1-AN-22 MUST** "Save to study" creates a new chapter, or overwrites a
  chosen chapter after confirmation (studies spec).
- **P1-AN-23 MUST** "Open in editor" with the current position.
  "Continue from here" from the editor lands here.

### Analysis sessions (raw data for Phase 4)

- **P1-AN-30 MUST** For signed-in users, opening the board from a source
  creates an `analysis_sessions` row. Sources are a library game (P3), a
  puzzle, a study chapter, or an uploaded PGN.
- **P1-AN-31 MUST** The session autosaves (debounced 5 s, and on page hide):
  - the PGN of the user's tree, including their own variations and comments
  - the last position key
  - `updated_at`
- **P1-AN-32 MUST** Engine evaluations are **not** persisted
  (2026-10-10-11; Phase 4 recomputes server-side).
- **P1-AN-33 SHOULD** Free analysis with no source creates a session only
  when the user makes at least 1 move. Sessions older than 90 days with no
  source and no edits are purged by a job. This is the only exception to
  append-only, because these rows have no source.

### Browser game review (SHOULD, M1.2b)

- **P1-AN-40 SHOULD** "Review game" runs `evaluateLine` over the mainline at
  a fixed depth (default 18) in the worker, with a progress bar. It can be
  cancelled.
- **P1-AN-41 SHOULD** Classify moves as lila does (`modules/analyse` Advice).
  - **Score:** winning chances `wc = 2/(1+e^(−0.00368208·cp)) − 1`, on a
    [−1, 1] scale, from the mover's point of view.
  - **Thresholds:** a wc drop of at least 0.1 / 0.2 / 0.3 is an inaccuracy /
    mistake / blunder.
  - **Mate:** mate swings are handled as lila does.
  - **Build step:** check the constants and mate handling against current
    lila source, and cite the commit in the file header.
  - Each classified move shows the engine's best move as an alternative.
- **P1-AN-42 SHOULD** Results show as glyphs plus a per-player summary.
  They can be exported as PGN comments tagged `[%eval]` with
  "CheckMate browser review, Stockfish 19 Lite, depth 18". They are labelled
  browser-computed and are not stored as truth.

## Data model

```
analysis_sessions (id uuid PK, user_id FK CASCADE,
  source_type text  -- 'game' | 'puzzle' | 'study_chapter' | 'upload' | 'free'
  source_id   text null,
  initial_fen text, pgn text, last_position_key text,
  created_at, updated_at timestamptz)
INDEX (user_id, updated_at DESC)
```

## API surface

- `POST /api/v1/analysis-sessions` → `{id}`
- `PATCH /api/v1/analysis-sessions/:id` (pgn, last_position_key)
- `GET /api/v1/analysis-sessions?source_type=&source_id=`, used to resume
  the user's last session for a game, puzzle or chapter

## Reuse

| Component | Mode |
|---|---|
| npm `stockfish` 19 | reused (GPL; source offer via Source link) |
| lila `ui/analyse` and `ui/ceval` | functional reference; ceval engine-management ideas adapted (AGPL) |
| Win% formula and thresholds | adapted from lila (AGPL; cite) |
| Move list, engine panel UI | independent (React + shadcn) |

## Chess-authority notes

Every number on screen comes from the provider (with provenance) or from
imported PGN (labelled). Game-ending states come from the rules layer.
Opening names come from the classifier.

## Phase 4 hooks

`analysis_sessions` records what the user studied and the lines they tried.
The provider interface lets a server provider replace browser Stockfish.

## Acceptance criteria

- Playwright:
  - load a PGN with variations → navigate with keys → promote a variation →
    export → the PGN matches the expected fixture
  - engine on → an eval appears within 2 s → a click on a PV move adds it to
    the tree
  - rapid ←/→ navigation never shows a stale node's eval
- With the engine on at depth ∞ for 60 s, main-thread long tasks stay under
  50 ms (performance trace).
- The engine works with and without cross-origin isolation (test both header
  modes).
- A fake provider swap renders identical UI (CORE-23).
- A session autosave survives a reload and resumes on reopening the same
  source.

## Open questions

- Tablebase lookup for ≤7 pieces: deferred. Lichess's tablebase is anonymous
  today but may require auth later, which makes it a Phase 4 server concern.
