# Curated masters set, Lichess-style, deduplicated by terminal position

Date: 2026-10-10
Status: Accepted

## Decision

The `masters` index is built the way Lichess builds its own. CheckMate
curates a PGN set and imports it in **manual batches** (monthly or
quarterly) through upstream lila-openingexplorer, applying upstream's rules:
- both Elo tags present, and **average Elo ≥ 2200**
- no future dates
- **deduplication by terminal position + year** (rather than by names and
  dates)

The sources differ from Lichess's in one way: only sources we have rights to
are used.
- **Now:** Lichess broadcasts (CC BY-SA 4.0).
- **Later:** TWIC and PGN Mentor once written permission is granted. Requests
  are tracked in `2026-10-10-masters-data-permission-requests.plan.md`.

Because broadcasts are CC BY-SA, the curated, deduplicated set is published
as a monthly PGN dump under CC BY-SA 4.0.

This supersedes the fingerprint-based OTB dedup in
2026-10-10-14-self-hosted-opening-explorer-from-licensed-data, and replaces
the pipeline spec's earlier "both players ≥ 2200" rule.

## Context

The user asked to copy Lichess's approach (2026-10-10). Research (2026-10-10):
- Lichess Masters (~3M games) started from Tony Rotella's curated 2016
  database. The source data lives in a private repo, `lichess-org/masters-db`.
- Lichess updates it in manual batches (Dec 2021; Sep 2024, ~200k games).
- Lichess has never published its sources or any TWIC permission.
- Upstream `PUT /import/masters` rejects duplicates by final position + year,
  by design, "to avoid having to deduplicate by names and dates".
- There is no delete endpoint; removing a game means a rebuild.
- TWIC is "free for personal use only", but asks online projects to get in
  touch.

## Alternatives rejected

- **Our own name/date fingerprint dedup** — fragile with name spellings, and
  disagrees with upstream, which would reject anyway.
- **Ingest TWIC without permission**, as Lichess may have — we can't verify
  their arrangement, and TWIC's terms are explicit.
- **Continuous automatic ingestion** — Lichess deliberately does manual
  batches. Batches let bad data be reviewed before it goes in, and there is
  no delete endpoint.

## Consequences

- Two different games ending in the same position in the same year (e.g.
  identical quick repetition draws) count once. This is accepted, as at
  Lichess.
- Removing bad games means rebuilding the index from the registry.
- The registry keys OTB games by `dedup_key`, so source membership is still
  tracked per game.
