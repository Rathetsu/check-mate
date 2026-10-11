---
kind: status
---

# Status

Last updated: 2026-10-10

## Where we are

**Planning is complete. No product is built yet.**

The full plan for the first release (Phases 1-3) is written: what we're
building, how it fits together, and why each major choice was made. The
build starts with Phase 1.

## What CheckMate will do (MVP)

**CheckMate**: *your chess mate*. The name is a play on "mate" as in
friend.

| Phase | What users get | State |
|---|---|---|
| 1. Chess platform | Accounts, analysis board with Stockfish in the browser, board editor, PGN/FEN import and export, private studies, themed puzzle training with saved history | Specified, not started |
| 2. Opening explorer | Opening statistics from Lichess games and master games combined without double counting, with filters, master game viewer, opening names, and a free download of our master-game dataset | Specified, not started |
| 3. Personal database | Connect Lichess and Chess.com, import and keep all your games, sync new ones, browse your library, see your personal opening tree and opening results, and compare with the wider database | Specified, not started |
| 4. AI coach | Conversational coaching grounded in engine and database facts | Not planned yet. Will be a separate, private service |

## Up next

Phase 1, milestone M1.0:
- project skeleton
- sign-up and sign-in, settings
- app shell in the CheckMate brand
- license, attribution and privacy pages

See docs/stream/2026-10-10-mvp-roadmap.plan.md.

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
- **Brand:** the name is CheckMate. The accent color is "Mate Violet"
  (#664CDD light / #A29DFF dark).

## Waiting on you

- **Send two permission emails** to unlock historical master games (TWIC
  1994 to now, and PGN Mentor). Drafts and tracking are in
  docs/stream/2026-10-10-masters-data-permission-requests.plan.md.
- **Logo (optional):** a text wordmark is used until one is designed.

## Deployed

Nothing deployed yet.
