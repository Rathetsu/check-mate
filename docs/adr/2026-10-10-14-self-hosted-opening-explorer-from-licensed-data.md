# Self-host the opening explorer on licensed data only

Date: 2026-10-10
Status: Accepted · masters dedup superseded by 2026-10-10-19-curated-masters-set-deduped-by-terminal-position

## Decision

Run upstream lila-openingexplorer (Rust/RocksDB, AGPL-3.0, unmodified
container) as CheckMate's explorer engine, with two indexes:
- `lichess` — fed from Lichess CC0 monthly dumps. Only a configured,
  size-bounded subset is ingested.
- `masters` — fed by CheckMate's OTB pipeline. It starts with Lichess
  broadcasts (CC BY-SA 4.0). Other OTB sources are added only after their
  license is cleared in the reuse register. Games are deduplicated by game
  fingerprint before `PUT /import/masters`.

Core's `/api/v1/explorer` merges `ExplorerSource` adapters. "All" only
unions sources that are disjoint by construction: online games vs OTB
games, each internally deduplicated.

Chess.com data never enters shared statistics.

An optional source, "Lichess.org via your account", proxies the official
explorer using the user's own Lichess token. It is never unioned.

## Context

Verified 2026-10-10:
- **Lichess explorer API:** since 2026-03-03 every request needs an OAuth
  token, at 20 requests/min per user. A shared server token can't serve
  production.
- **Lichess Masters:** about 3M games, not downloadable.
- **Chess.com:** User Agreement §4(D) bans "game databases" and "dataset
  creation". No bulk data.
- **Other OTB collections:**
  - TWIC is personal use only.
  - Lumbra's GigaBase is CC BY-NC.
  - PGN Mentor, Caissabase and KingBase licenses are unverified.

The brief requires unified, deduplicated, filterable statistics and backend
ingestion, and says to reuse lila-openingexplorer.

## Alternatives rejected

- **Proxy Lichess's explorer with a server token** — auth and rate limit
  since 2026-03; not production-viable.
- **Build our own explorer in Postgres** — rebuilds a mature RocksDB design
  that already supports rating, speed and month buckets.
- **Ingest TWIC, Lumbra's, KingBase** — license terms forbid or are unclear.
- **Crawl Chess.com players** — ToS violation.

## Consequences

- Masters coverage is limited to licensed sources (broadcasts start around
  2020). Historical coverage is an open item.
- The UI must show CC BY-SA attribution for broadcast-derived stats.
- A filter a source can't honor removes that source from the union, and the
  UI flags it.
- Explorer disk needs grow with the subset; it may move to its own host
  (2026-10-10-16-docker-compose-on-single-vps).
- Admin `/import/*` routes are never publicly exposed.
