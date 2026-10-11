# Self-hosted Syzygy tablebase, not the Lichess API

Date: 2026-10-11
Status: Accepted

## Decision

The analysis board shows perfect-play endgame results (win/draw/loss, DTZ,
and the outcome of each move) from Syzygy tablebases that CheckMate hosts
itself:
- An **unmodified upstream lila-tablebase** container (AGPL, Rust), built
  from source at a pinned commit. It is internal only, like the explorer
  (2026-10-10-14).
- The Syzygy files sit on a **read-only volume**. `scripts/fetch-syzygy.sh`
  downloads them from a non-Lichess mirror and verifies checksums. They are
  never loaded into Postgres.
- `GET /api/v1/tablebase?fen=` validates the FEN through `packages/chess`
  and only queries positions within the installed piece count. Results are
  labelled "Syzygy tablebase".
- **Coverage grows by adding files,** with no code change:
  - 3-5 pieces now (~1 GB, on the app VPS)
  - 6 pieces on an attached volume when disk allows (~150 GB)
  - 7 pieces only on a dedicated storage server if ever justified (~17 TiB);
    only the URL changes

Positions outside coverage show no tablebase result. Nothing is estimated
(2026-10-10-02).

## Context

The spec deferred tablebases because Lichess's API might require auth later.
The user (2026-10-11) wants the feature without depending on that API.
Endgames up to 7 pieces are solved, and the files are freely downloadable.
Lichess serves all 7-piece tables from one dedicated server (6 HDDs in
RAID 5, NVMe for the index data, 32 GiB RAM; Lichess blog, 2024). The Syzygy
format is already heavily compressed, so a database copy would be much larger
with no benefit.

## Alternatives rejected

- **Lichess tablebase API** — an external runtime dependency the user
  rejected.
- **Rows in Postgres** — orders of magnitude larger than the compressed files.
- **All 7 pieces now** — about 17 TiB of storage for a soft launch under 5
  users.
- **Probing in the browser** — gigabytes per client.

## Consequences

- The Syzygy files need a register row marked **cleared** before the first
  download (2026-10-10-14 rule). The generator is GPL-2.0, but the files'
  terms still need checking. Until cleared, the feature ships disabled.
- Compose gains a `tablebase` service, and lila-tablebase gets a register
  row with its source linked on `/about`.
- CI uses a tiny table set (KRvK, KQvK).
