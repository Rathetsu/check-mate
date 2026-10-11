# Spec: Opening explorer data pipeline

Date: 2026-10-10
Status: Approved (design; no code yet)
Phase: 2 · Milestones M2.1 (service + Lichess index) and M2.3 (OTB pipeline, dedup, public dataset)

## Goal

Feed a self-hosted lila-openingexplorer with legally usable data through
backend jobs:
- a size-bounded **Lichess** online index (CC0 dumps)
- a deduplicated **OTB/masters** index (Lichess broadcasts first; other
  sources only once cleared)

Ingestion is repeatable, observable and idempotent. Every game's source is
recorded.

Decisions: 2026-10-10-14-self-hosted-opening-explorer-from-licensed-data ·
2026-10-10-06-postgres-drizzle-and-pg-boss ·
2026-10-10-16-docker-compose-on-single-vps ·
2026-10-10-04-license-core-agpl-3-or-later ·
2026-10-10-19-curated-masters-set-deduped-by-terminal-position.

## Scope

In: running the explorer service, Lichess dump ingestion, the OTB source
registry, the OTB normalize/dedup/import pipeline, the public CC BY-SA
masters dump, ingestion runs, coverage metadata, ops (compaction,
monitoring, rebuild).
Out: the explorer API and UI (see p2-opening-explorer spec), Chess.com data
(excluded by ADR 14), personal games (P3).

## Explorer service

- **P2-EI-01 MUST** `explorer` compose service runs the upstream
  `lila-openingexplorer` image or binary:
  - pinned to a release (v3.0.0 as of 2026-10-10)
  - unmodified
  - RocksDB on a dedicated volume (NVMe/SSD)
- **P2-EI-02 MUST** Network exposure:
  - Only `packages/core` (web and worker) reaches the explorer, on the
    internal network.
  - Admin routes (`/import/*`, `/compact`, `/monitor*`) are never routed by
    Caddy.
  - No public port.
- **P2-EI-03 MUST** Config (`EXPLORER_URL`) lets the service live on a
  separate host with no code change (ADR 16).
- **P2-EI-04 MUST** `/about` links to the upstream source. If CheckMate
  ever patches upstream, the fork is published (AGPL).

## Lichess online index (`lichess`)

- **P2-EI-10 MUST** Worker job `explorer:ingest-lichess {month}`:
  1. Streams `lichess_db_standard_rated_YYYY-MM.pgn.zst` from
     database.lichess.org (CC0).
  2. Decompresses with streaming zstd.
  3. Parses the headers it needs: Site/id, players' ratings, TimeControl,
     Result, UTCDate, Variant, and the moves.
  4. Applies the ingestion filter.
  5. Sends batches to upstream's Lichess import endpoint in its documented
     JSON format. The exact route and payload are confirmed against the
     pinned release at build time.
- **P2-EI-11 MUST** Ingestion filter config, stored with every run:
  `{ months: [from, to], sampleRate: 0<r≤1, minAvgRating?: int, speeds?: [] }`.
  - The default is decided in M2.1 by sizing: ingest one month at
    `sampleRate=1`, measure RocksDB growth, then set the window and rate so
    projected size fits 70% of the volume.
  - **Use uniform sampling, not a rating floor, by default.** A rating
    floor empties the low rating buckets, while uniform sampling keeps the
    rating distribution intact.
- **P2-EI-12 MUST** Idempotent per month: re-running a completed month is a
  no-op unless forced. A forced re-run requires rebuilding the index from
  scratch (documented runbook). Never double-ingest a month.
- **P2-EI-13 MUST** After a bulk ingestion, trigger upstream compaction.
- **P2-EI-14 MUST** Coverage metadata (months, sample rate, total games
  indexed) is written to `explorer_coverage`. The UI shows it ("Lichess:
  ~N games, 2024-10 – 2026-09, 10% sample").

## OTB / masters index (`masters`)

Approach: Lichess's own method (curated set, manual batches, upstream rules),
restricted to sources we have rights to. See
2026-10-10-19-curated-masters-set-deduped-by-terminal-position.

### Source registry

- **P2-EI-20 MUST** OTB sources are declared in code
  (`packages/core/src/explorer/otb-sources.ts`). Each entry has:
  - `id`, `name`, `homepage`, `license` (SPDX or text)
  - `attribution` (UI string)
  - `cleared: boolean`
  - `inPublicDump: boolean`
  - a `fetch` descriptor (URL template, or manual upload of permitted files)
- **P2-EI-21 MUST** The pipeline refuses to ingest a source with
  `cleared: false`. A source may only be set `cleared: true` in the same
  commit that adds or updates its row in `docs/wiki/open-source-reuse.md`,
  with the permission or license recorded.
- **P2-EI-22 MUST** Initial registry:
  - `lichess-broadcasts`: monthly broadcast dumps, CC BY-SA 4.0,
    `cleared: true`, `inPublicDump: true`. Attribution "Lichess broadcast
    games, CC BY-SA 4.0".
  - `twic`: `cleared: false`, pending written permission
    (2026-10-10-masters-data-permission-requests.plan.md).
  - `pgn-mentor`: `cleared: false`, pending written permission (same plan).
  - `lumbras-gigabase`: CC BY-NC, `cleared: false`. Excluded.

### Batch pipeline (worker job `explorer:ingest-otb {sourceId, ref}`)

Batches are run **manually** by an operator, monthly or quarterly, the way
Lichess does it. Batches are not scheduled automatically, because upstream
has no delete endpoint and bad data costs a rebuild.

1. **Fetch**: stream the source file and record the `ingestion_runs` row.
2. **Parse**: use `packages/chess` streaming PGN. Every move is validated,
   and invalid games are counted and skipped.
3. **Normalize** headers for display and search:
   - player names: NFKD, strip accents and punctuation, lowercase
   - date
   - result
   - Elo
   - event, site, round
4. **Eligibility**, using upstream's rules:
   - standard chess
   - result `1-0 | 0-1 | 1/2-1/2`
   - both `WhiteElo` and `BlackElo` present, with an **average ≥ 2200**
   - date not in the future
   - not marked blitz or bullet (TimeControl/Event, when known)
   - Ineligible games are kept in the registry with `eligible=false`.
5. **Dedup key**: `terminalKey(game)` = the final position's `positionKey`
   plus the year. This matches upstream's terminal-position dedup, so our
   registry and the index always agree.
6. **Deduplicate**: if the key already exists, the game is a duplicate. Only
   an `otb_game_sources` membership row is added. There is no name or date
   matching.
7. **Import**: each new, eligible game goes to upstream
   `PUT /import/masters`:
   - body `{id, event, site, date, round, white{name,rating}, black{name,rating}, winner, moves}`
   - id = 8 base62 characters derived from `dedup_key`, with collision
     checking
   - Record `imported_at`. If upstream rejects a game, store the reason.
8. **Report**: run counts are seen / invalid / ineligible / duplicate /
   rejected-by-upstream / imported.

- **P2-EI-30 MUST** Re-running any source ref is idempotent. `dedup_key`
  uniqueness prevents double counting (the brief's critical requirement).
- **P2-EI-31 MUST** A game appearing in several sources is counted once in
  `masters`. Every source it came from is recorded in `otb_game_sources`.
- **P2-EI-32 MUST** Per-source statistics stay recoverable from the
  registry: counts by source, and membership.
- **P2-EI-33 SHOULD** An admin page (role-gated, operators only) lists runs,
  rejected games and per-source counts, and has a "start batch" action.
- **P2-EI-34 MUST** `lichess` (online) and `masters` (OTB) never share games
  by construction. "All" can union them safely (ADR 14).
- **P2-EI-35 MUST** Monthly CC BY-SA 4.0 dataset dump (share-alike,
  2026-10-10-17-self-administered-license-compliance):
  - a `masters-YYYY-MM.pgn.zst` file holding every imported game from
    sources with `inPublicDump: true`
  - a `SOURCES.md` crediting each source
  - a `LICENSE` (CC BY-SA 4.0)
  - published on `/about/data` and linked from the explorer's Masters
    attribution
- **P2-EI-36 MUST** Removing games (bad data, a source withdrawn):
  1. Mark the registry rows `excluded_at`.
  2. Rebuild the masters index from the registry. Upstream can't delete
     games.
  - The next public dump omits the excluded games.

## Data model

```
explorer_otb_games (id uuid PK, dedup_key text UNIQUE,   -- terminalKey: final positionKey + year
  masters_id text UNIQUE,
  white text, black text, white_norm text, black_norm text,
  white_elo int, black_elo int, date text, year int,
  event text, site text, round text, result text,
  eco text null, opening_name text null,       -- from our classifier (derived)
  ply_count int, pgn text,                     -- raw, validated
  eligible bool, upstream_reject_reason text null,
  imported_at timestamptz null, excluded_at timestamptz null, created_at)
INDEX (white_norm), (black_norm), (year), (event)

otb_game_sources (game_id FK, source_id text, source_ref text, source_game_key text null,
  first_seen_at timestamptz, PRIMARY KEY (game_id, source_id, source_ref))

explorer_coverage (source text PK, details jsonb, updated_at)   -- months, sample, counts
```

`ingestion_runs` is the shared table (core-architecture spec).

## Ops runbook (written in `docs/wiki` when built)

- Rebuild an index from scratch:
  1. Stop the service and wipe its volume.
  2. Replay: Lichess months from the run history; masters from
     `explorer_otb_games` where `eligible AND excluded_at IS NULL`.
- Disk alert at 80%: shrink the window or sample rate, or move to the bigger
  host.
- Upgrade upstream: pin the new version, rebuild in a staging volume, then
  switch over.

## Reuse

| Component | Mode |
|---|---|
| lila-openingexplorer | reused, unmodified (AGPL) |
| Lichess dumps (CC0), broadcasts (CC BY-SA 4.0) | reused data |
| Lichess masters method (`import-master.py` rules, terminal-position dedup, manual batches) | adapted (AGPL; rules mirrored in a TS pipeline that adds source tracking) |
| Normalizer, registry, dump publisher | independent |

## Chess-authority notes

Every game is validated move by move by the rules layer before it is
indexed. Statistics are counts of real games. Nothing is estimated or
synthesized.

## Phase 4 hooks

`explorer_otb_games` lets the AI service fetch real master games by
position or opening through the API. Source membership supports
attribution.

## Acceptance criteria

- Ingesting the same broadcast month twice leaves `masters` game counts
  unchanged (idempotence test against the running service).
- A fixture with three copies of one game (different header spellings and
  sources) gives 1 imported game and 3 source memberships.
- A game with Elos 2300/2050 (average 2175) is ineligible. A game with
  2400/2050 (average 2225) is imported.
- Ingesting with `cleared: false` fails fast with a clear error.
- The monthly dump re-imports into a fresh index with identical masters
  counts, and contains no `inPublicDump: false` games.
- Excluding a game, then rebuilding, removes it from `/masters` stats.
- The sizing report from M2.1 is recorded in the stream (`*.review.md`).
- The explorer port is unreachable from outside the compose network (smoke
  test).

## Open questions

- TWIC and PGN Mentor permission replies
  (2026-10-10-masters-data-permission-requests.plan.md). Until then, masters
  coverage is broadcasts only (about 2020 onward).
- Whether to index broadcast rapid/blitz as a separate OTB-rapid source:
  deferred.
