# Spec: Analysis board and engine analysis

Date: 2026-10-10
Status: Approved. M1.2 built 2026-10-11 (see Build notes); M1.2b (game review) not started
Phase: 1 · Milestones M1.2 (board + engine) and M1.2b (browser game review)

## Goal

A Lichess-grade analysis board. Users explore freely, build variation trees,
annotate, load and export PGN/FEN, and get Stockfish evaluations in the
browser. The engine never blocks the UI.

Decisions: 2026-10-10-09-browser-stockfish-behind-analysis-provider ·
2026-10-10-08-single-chessground-board-component ·
2026-10-10-11-raw-player-data-append-only-aggregates-derived ·
2026-10-11-02-analysis-sessions-are-mutable-working-copies ·
2026-10-11-05-saved-browser-reviews-are-private-labelled-cache ·
ADR 2026-10-11-06 (self-hosted tablebase).
Contracts: `AnalysisProvider` and `TreeCursor` (core-architecture spec,
chessboard spec).

## Scope

In: free exploration, variation tree, move list, annotations, engine panel,
PGN/FEN load and export, share links, save to study, analysis sessions,
browser game review saved per user (M1.2b), self-hosted endgame tablebase
lookup (added 2026-10-11).
Out: server-side analysis (Phase 4), cloud evals, the Lichess tablebase API,
opening explorer panel (P2 adds it as a tab).

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
- **P1-AN-04 MUST** Annotations, in scalachess `Glyph.scala`'s three groups
  (ids, symbols and names copied at a pinned commit; reworded 2026-10-11 to
  match where the glyphs actually live):
  - **Move** (one at a time): `!`, `?`, `!!`, `??`, `!?`, `?!`, `□` only
    move, `⨀` zugzwang.
  - **Position** (one at a time): `=`, `∞`, `⩲`, `⩱`, `±`, `∓`, `+−`, `−+`.
  - **Observation** (any number): novelty, development, initiative, attack,
    counterplay, time trouble, with compensation, with the idea.
  - **Comments:** one per node per author.
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
  encodes the FEN of the current node.
  - **Full-PGN link** (COULD until 2026-10-11, now in Phase 1): the whole tree,
    compressed into the URL hash.
  - The size is checked *before* the link is offered.
  - Over the cap, a plain, friendly message explains that this analysis is
    too big for a link and offers the FEN link or "Save as study and share"
    instead. Never a broken or truncated link.
- **P1-AN-22 MUST** "Save to study" creates a new chapter, or overwrites a
  chosen chapter after confirmation (studies spec). Lands with M1.4, once
  studies exist.
- **P1-AN-23 MUST** "Open in editor" with the current position.
  "Analyze" from the editor lands here.

### Analysis sessions (working copies for Phase 4)

- **P1-AN-30 MUST** For signed-in users, opening the board from a source
  creates an `analysis_sessions` row. Sources are a library game (P3), a
  puzzle, a study chapter, or an uploaded PGN.
- **P1-AN-31 MUST** The session is a mutable working copy
  (2026-10-11-02-analysis-sessions-are-mutable-working-copies). Autosave
  (debounced 5 s, and on page hide) overwrites:
  - the PGN of the user's tree, including their own variations and comments
  - the last position key
  - `updated_at`
- **P1-AN-32 MUST** Live engine-panel evaluations are **not** persisted
  (2026-10-10-11; Phase 4 recomputes server-side). Saved game reviews are a
  separate, explicit, labelled cache (P1-AN-43).
- **P1-AN-33 SHOULD** Free analysis with no source creates a session only
  when the user makes at least 1 move. Free sessions not updated for 90 days
  are purged by a job. *(2026-10-11: build in Phase 1.)*

### Browser game review (SHOULD, M1.2b; 2026-10-11: build, saved per user)

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
  "CheckMate browser review, Stockfish 19 Lite, depth 18". They are always
  labelled browser-computed and are never treated as truth.
- **P1-AN-43 MUST** (added 2026-10-11,
  2026-10-11-05-saved-browser-reviews-are-private-labelled-cache) Each review
  run is saved for the signed-in user:
  - Stored as an append-only `game_reviews` row, keyed by `line_key` (SHA-256
    of the initial FEN plus the mainline UCI).
  - Reopening the same mainline from any page shows the latest run with no
    recompute. A picker lists earlier runs, and "Re-run" (choose depth) adds a
    new run.
  - Reviews are read only by the owner's review UI. They never feed stats,
    datasets or other features.
  - Anonymous users can review but nothing is saved.

### Tablebase (added 2026-10-11, ADR 2026-10-11-06)

- **P1-AN-50 MUST** For legal positions within the installed tablebase piece
  count (3-5 pieces at launch), the panel shows the tablebase result
  (win / draw / loss and DTZ) and each legal move's outcome. Clicking a move
  plays it into the tree.
- **P1-AN-51 MUST** Results come only from the self-hosted lila-tablebase
  service through `GET /api/v1/tablebase?fen=`, which validates the FEN with
  `packages/chess`. They are labelled "Tablebase", never mixed into the
  engine panel or eval bar. Positions outside coverage show nothing.
- **P1-AN-52 MUST** If the tablebase service is down or not configured
  (`TABLEBASE_URL` unset), the section is hidden. The board and engine are
  unaffected.
- *2026-10-11 (owner decision):* the tablebase files are free to use. There
  is no licence gate and no register row for them, and the product calls
  them "tablebase" only.

## Data model

```
analysis_sessions (id uuid PK, user_id FK CASCADE,
  source_type text  -- 'upload' | 'free' (M1.2); 'game' | 'puzzle' | 'study_chapter' later
  source_id   text null,  -- upload: SHA-256 of the normalized game PGN
  initial_fen text, pgn text,
  last_path text,          -- where to resume (added in M1.2)
  last_position_key text,
  created_at, updated_at timestamptz)
INDEX (user_id, updated_at DESC), INDEX (user_id, source_type, source_id)

game_reviews (id uuid PK, user_id FK CASCADE,   -- append-only, one row per run
  line_key text, initial_fen text, moves text[],  -- mainline UCI
  provenance jsonb, depth int,
  plies jsonb,     -- per ply: score, classification, best move (UCI)
  summary jsonb, created_at timestamptz)
INDEX (user_id, line_key, created_at DESC)
```

## API surface

All bodies are JSON; errors use the CORE-41 envelope
`{error: {code, message, details?}}`. Session routes need a signed-in user;
another user's session is always `404 NOT_FOUND` (CORE-52).

- `POST /api/v1/analysis-sessions`
  - body `{sourceType: 'upload' | 'free', sourceId: string | null, pgn, lastPath}`
  - `201 {id}`. `400` with the PGN error code when the PGN doesn't load
    through the rules layer (`ILLEGAL_MOVE`, `PGN_SYNTAX`, …); `413
    TOO_LARGE` over 1 MB.
  - The server derives `initial_fen` and `last_position_key` from the PGN;
    `lastPath` is cut back to the nearest move that exists.
- `PATCH /api/v1/analysis-sessions/:id`
  - body `{pgn, lastPath}`, same checks. `204`.
- `GET /api/v1/analysis-sessions?source_type=&source_id=`
  - `200 {id, sourceType, sourceId, pgn, lastPath, updatedAt}` for the
    user's latest session for that source, or `404`.
  - Pages load a session by id on the server (`/analysis?session=<id>`), so
    there's no `GET /:id` route.
- `POST /api/v1/game-reviews`; `GET /api/v1/game-reviews?line_key=` (runs,
  newest first). M1.2b.
- `GET /api/v1/tablebase?fen=` (anyone, signed in or not)
  - `200 {label: 'Tablebase', category, dtz, moves: [{uci, san, category,
    dtz}]}`. `category` is from the side to move: `win`, `maybe-win` (a win
    the 50-move rule might turn into a draw), `cursed-win`, `draw`,
    `blessed-loss`, `maybe-loss`, `loss`. Each move's category is from the
    side that plays it.
  - `204` when the position has castling rights, more pieces than
    `TABLEBASE_MAX_PIECES`, no installed table, or the service is down or
    unset (1.5 s timeout).
  - `400 BAD_FEN` for an invalid FEN.

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
- A full-PGN link over the cap is never offered. The friendly message appears
  instead.
- A KRvK position shows the tablebase result and per-move outcomes. A
  6-piece position shows no tablebase section.
- Review a game → reload → the latest review shows with no recompute. A
  re-run adds a second run to the picker. User B can't read user A's reviews
  (404).

## Open questions

- Resolved 2026-10-11: tablebase lookup is built self-hosted (P1-AN-50..52,
  ADR 2026-10-11-06).

## Build notes

### M1.2 (2026-10-11)

Built per docs/stream/2026-10-11-m1.1-m1.4-build.plan.md.
- **Layout:** the side panel holds the engine panel and the tablebase
  section above tabs Moves · Annotate · Info, so engine lines stay visible
  while you move. On phones the panel stacks under the board instead of a
  bottom sheet.
- **One mutation path:** every tree change is a `TreeOp` through
  `applyOp` (`packages/chess/src/ops.ts`): `addNode`, `deleteNode`,
  `promote`, `setComment`, `setNags` (a full set), `setShapes`. Each is
  idempotent. `applyOp` normalizes NAGs (one move glyph, one position
  glyph) and shapes.
- **Engine** (`apps/web/src/engine/`):
  - `browser-stockfish.ts` follows lila's ceval: a new search stops the
    running one and starts after its `bestmove`; lines are tagged with
    their FEN and shown only for that FEN.
  - The multi-threaded build runs when the page is cross-origin isolated
    (default threads `hardwareConcurrency − 1`, max 8); otherwise the
    single-threaded build.
  - Threads, hash and the best-move arrow are per-device settings in
    localStorage; flavor, lines, depth and on/off stay account preferences.
  - Isolation (COOP + COEP) covers `/analysis` and `/studies`. Workers
    started by those pages must carry COEP too, so `/engine/*` and
    `/_next/static/*` send it. Links across the boundary are full page
    loads (`NavLink`).
- **Opening names:** 3,865 named lines from chess-openings, keyed by
  `positionKey`, loaded on demand (450 KB). The deepest named position along
  the line wins.
- **Sessions:** `last_path` was added so a reload resumes on the same move.
  Uploads are keyed by the SHA-256 of the normalized PGN, so reopening the
  same game resumes it.
- **Share:** "Copy link to the whole analysis" in the Export menu; over
  8,000 characters a dialog offers the position link instead.
- **Command palette** (`/`) and shortcut help (`?`) are global; pages
  register their actions.
- **Tests:** UCI parser on captured engine output, ops, glyphs,
  `classifyLine`, tablebase mapping against a stub server, sessions
  (CRUD, cross-user 404, purge), `pgn-link`. Playwright: analysis, engine
  (real Lite engine, isolated and not, fake provider, stale-eval guard, a
  10 s long-task check; `LONGTASK_SECONDS=60` runs the full minute) and
  tablebase.
- **Acceptance mapping:** "an eval within 2 s" is measured from the engine
  having loaded; the first download of the WASM is not counted.

