# Personal opening tree as a derived Postgres position index

Date: 2026-10-10
Status: Accepted

## Decision

After each import, the worker writes the first 40 plies of every
standard-chess game into a derived table:

`game_positions(user_id, game_id, ply, position_key, move_uci, move_san)`

with an index on `(user_id, position_key)`.

The personal opening tree is a SQL aggregate over this table joined to
`games`, with filters applied in SQL. Wins, draws and losses are counted from
the user's side of the board (`games.user_result`).

`position_key` is a **normalized EPD** made of:
- piece placement
- side to move
- castling rights
- en passant square, only when an en passant capture is legal

One `positionKey()` function in `packages/chess` computes it, and every
feature uses it (tree, explorer, puzzles, Phase 4).

## Context

The brief requires persisted games, filters on color, platform, rating, time
control and date, and fast navigation. OpeningTree (GPL-3.0, React 16 class
components) rebuilds its tree in the browser from freshly fetched games every
visit and persists nothing. chessops has no Zobrist hash. EPD strings are
readable when debugging and match the chess-openings `epd` column.

## Alternatives rejected

- **OpeningTree's in-browser recompute** — no persistence; re-downloads the
  full history; slow past 20k games.
- **Feeding personal games into lila-openingexplorer `/player`** — it only
  indexes Lichess players; Chess.com and PGN uploads can't go there.
- **Storing all plies** — 80+ rows per game across all users is too much
  storage. Full PGN is kept, so the cap can be raised later by reindexing.
- **Zobrist bigint key** — we'd write and maintain our own hashing; a
  `text` key is fine at MVP scale.

## Consequences

- `game_positions` is derived
  (2026-10-10-11-raw-player-data-append-only-aggregates-derived), rebuilt by a
  `reindex-user-positions` job.
- Transpositions merge automatically because rows are keyed by position.
- Reuse OpeningTree's UX ideas (filters, perspective), not its code.
- The 40-ply cap is a known ceiling. Raise it by changing the constant and
  reindexing.
