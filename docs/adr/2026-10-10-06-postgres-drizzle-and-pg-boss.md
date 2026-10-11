# PostgreSQL as the only app datastore, with Drizzle and pg-boss

Date: 2026-10-10
Status: Accepted

## Decision

PostgreSQL (16+) is the only application datastore: users, preferences,
studies, puzzles, puzzle attempts, games, import runs, derived indexes,
explorer cache. Schema and queries use Drizzle ORM (0.45.x stable;
migrations via drizzle-kit). Background jobs use pg-boss 12 on the same
Postgres. Job progress lives in our own tables (e.g. `import_runs`), because
pg-boss has no progress API. The opening explorer's RocksDB, inside the
upstream lila-openingexplorer container, is the only other store
(2026-10-10-14-self-hosted-opening-explorer-from-licensed-data).

## Context

Phases 1-3 need relational data, array columns with GIN indexes (puzzle
themes), GROUP BY aggregates (opening trees), and durable jobs with retries
for imports. One datastore keeps operations simple on a single VPS
(2026-10-10-16-docker-compose-on-single-vps). Checked 2026-10-10: pg-boss
12.37 needs Node 22.12+ and Postgres 13+, and Drizzle 1.0 is still an RC.

## Alternatives rejected

- **Prisma** — npm `latest` points at an 8.0 RC; weaker for hand-tuned
  aggregate SQL; heavier runtime.
- **Redis + BullMQ** — a second datastore to run, back up and monitor, for no
  MVP gain.
- **Graphile Worker** — capable, but still 0.x; pg-boss has dead-letter,
  singleton and throttle policies we need for per-account imports.
- **MongoDB (as lila)** — the brief prefers Postgres; relational filters on
  games fit SQL.

## Consequences

- When Drizzle 1.0 lands, plan its migration-folder change (`drizzle-kit up`)
  as a dedicated task.
- Use pg-boss `singletonKey` for per-account job exclusivity, and
  `retryLimit`/`retryBackoff` for transient API failures.
- Create jobs inside the same transaction as the rows that trigger them.
