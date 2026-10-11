---
kind: status
---

# Status

Last updated: 2026-10-11

## Where we are

**Phase 1 is under way. M1.0 (the foundation), M1.1 (the chessboard), M1.2
(the analysis board), M1.3 (the board editor) and M1.4 (studies) are
built.**
- **Accounts:** people can create an account with a unique username, sign
  in, reset a forgotten password, verify their email, change settings, see
  and end their sessions, and delete their account.
- **Look:** the app has its CheckMate look in light and dark (Mate Green
  on a soft eggshell background), plus About, Privacy and Source pages.
  On desktop the sidebar collapses to icons and remembers that choice.
- **Home page:** a hero about the AI coach. Its board pulls apart into
  layers (squares, which side controls each square, pieces) as you scroll,
  then cards lead to each feature that's built.
- **The analysis board** (`/analysis`):
  - a real chessboard: drag or click to move, promotion, arrows in four
    colors, flip, arrow keys, typed moves, variations
  - Stockfish 19 in the browser: an eval bar, up to five lines, a best-move
    arrow, and a choice of the small Lite engine or the full one. It uses
    several cores when the browser allows
  - the endgame tablebase for positions with up to 5 pieces, shown apart
    from the engine
  - glyphs and comments, a right-click menu on moves (promote, make
    mainline, delete, copy the line), collapsible variations
  - the opening name for the current line, and checkmate, stalemate and
    draw messages
  - import a PGN or FEN, export PGN or FEN, a link to the position, and a
    link that carries the whole analysis
  - signed-in users' analysis saves itself and picks up where they left off
    (Home shows "Continue your last analysis")
- **The board editor** (`/editor`): place pieces by dragging or tapping,
  erase, clear, flip, swap colors, set the side to move, castling, en
  passant and move counters, paste a FEN, and see every reason a position
  isn't legal. "Analyze" opens it on the analysis board, and the analysis
  board's "Open in editor" comes back.
- **Studies** (`/studies`), like Lichess without chat:
  - chapters from an empty board, a FEN, a PGN (one per game) or a Lichess
    game link, edited with the analysis board and saved as you go
  - chapter descriptions, PGN tags, clearing comments or variations,
    reordering, copying chapters between studies, a multiboard
  - interactive lessons (hints, "that's not the move" text), practice
    against the computer, and "hide next moves"
  - export as PGN, PNG or GIF; links to a study, chapter or position
  - private, unlisted or public; likes, topics, browse and search, clone,
    and an embed for other sites
  - invite members by username as contributors or viewers; they accept,
    then everyone sees edits live and can follow each other's position
  - "Save to study" from the analysis board and the editor
- **Shortcuts:** `/` opens a command palette on every page, `?` lists the
  keys.
- **Board looks:** 11 piece sets, four board colors and four sound sets
  follow your settings.

Every check runs automatically on each change.

The full plan for the first release (Phases 1-3) is written: what we're
building, how it fits together, and why each major choice was made. The
build starts with Phase 1.

## What CheckMate will do (MVP)

**CheckMate**: *your chess mate*. The name is a play on "mate" as in
friend.

| Phase | What users get | State |
|---|---|---|
| 1. Chess platform | Accounts, analysis board with Stockfish in the browser, endgame tablebase, saved game reviews, board editor, PGN/FEN import and export, studies like Lichess (sharing and live collaboration, no chat), themed puzzle training with saved history | In progress: accounts, the chessboard with PGN/FEN, the analysis board with engine and tablebase, the board editor and studies are built |
| 2. Opening explorer | Opening statistics from Lichess games and master games combined without double counting, with filters, master game viewer, opening names, and a free download of our master-game dataset | Specified, not started |
| 3. Personal database | Connect Lichess and Chess.com, import and keep all your games, sync new ones, browse your library, see your personal opening tree and opening results, and compare with the wider database | Specified, not started |
| 4. AI coach | Conversational coaching grounded in engine and database facts | Not planned yet. Will be a separate, private service |

## Up next

Phase 1, milestone M1.5: themed puzzle training with saved history.

See docs/stream/2026-10-10-mvp-roadmap.plan.md and the build plan in
docs/stream/2026-10-11-phase-1-implementation.plan.md.

## Decided (2026-10-10)

- **Open source:** the core platform is open source (AGPL). The future AI
  coach stays private and separate.
- **Hosting:** everything runs on one server with Docker to start.
- **Legal:** no lawyer needed while CheckMate is free and open source. A
  built-in compliance checklist gates every release. A one-off paid review
  happens only when we start charging, take investment, launch the AI
  coach publicly, receive a complaint, or register the trademark.
- **Chess.com:** users can import their own Chess.com games, as
  OpeningTree does. This is an accepted risk with safeguards: only linked
  accounts (max 3), private to the user, never pooled, and switchable off
  instantly.
- **Master games:** we copy Lichess's method (a curated set, updated in
  batches, duplicates removed by final position), using only sources we're
  allowed to use. Today that means Lichess broadcast games from about 2020
  onward.
- **Brand:** the name is CheckMate. The accent color is "Mate Green"
  (#156B4A light / #64C897 dark) on a warm eggshell light theme. It
  replaced Mate Violet on 2026-10-11 (ADR 2026-10-11-08).

## Decided (2026-10-11)

- **Soft launch:** the first release is for fewer than 5 users, with no
  domain and no email service. Email verification is sent but not required.
  Without email settings, verification and reset links go to the server log
  and you pass them on. Account data export waits until launch. All of this
  flips before marketing starts (ADR 2026-10-11-03).
- **Code checks:** ESLint + Prettier enforce the architecture rules
  (ADR 2026-10-11-01).
- **Analysis sessions** keep the latest version only, not a history
  (ADR 2026-10-11-02).
- **Small picks:** Geist font, `next-themes`, breached-password check via
  Have I Been Pwned, GitHub Actions for CI.
- **Studies work like Lichess, without chat:** public or private studies,
  clone, likes, topics, embedding, interactive lessons, practice against the
  computer, and live editing with invited members (ADR 2026-10-11-04).
- **Usernames:** every account picks a unique username at sign-up, used to
  invite people to studies.
- **Game reviews are saved:** a reviewed game stays reviewed for that user.
  Every run is kept, and it's always labelled as a browser review, never
  treated as fact (ADR 2026-10-11-05).
- **Endgame tablebase, self-hosted:** perfect endgame answers for positions
  with up to 5 pieces, served from our own copy of free tablebase files, not
  Lichess's service. It grows to 6 pieces when disk allows (ADR
  2026-10-11-06).
- **Piece sets:** 11 instead of 12. "Staunton" turned out to exist only as
  3D-board images, and its 2D cousin has a non-commercial licence.
- **Every optional Phase 1 item was decided one by one.** The list is in the
  build plan. One is dropped for good: browser back/forward through editor
  edits. Two-factor sign-in waits until later.

## Waiting on you

- **One manual check (2 minutes):** export a PGN with variations, comments
  and arrows from `/analysis`, import it into a Lichess study, and confirm it
  looks the same (pgn-fen spec acceptance criteria).
- **A contact address (optional):** the Privacy page points to GitHub
  issues for now. Give me an address if you'd rather people email.
- **Send two permission emails** to unlock historical master games (TWIC
  1994 to now, and PGN Mentor). Drafts and tracking are in
  docs/stream/2026-10-10-masters-data-permission-requests.plan.md.
- **Logo:** you're designing a pawn mascot with an image generator; the
  prompt is in the UI shell spec's "Logo brief". A text wordmark is used
  until the SVG files arrive.
- **Before marketing:** buy a domain, pick an email service, then turn on
  required verification and ship data export (ADR 2026-10-11-03).

## Deployed

Nothing deployed yet.
