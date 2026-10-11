# Run Phases 1-3 with Docker Compose on a single VPS

Date: 2026-10-10
Status: Accepted

## Decision

Production for Phases 1-3 is one Docker Compose stack on a VPS with these
services:
- `web` (Next.js)
- `worker` (pg-boss consumers)
- `postgres`
- `caddy` (TLS, reverse proxy)
- `explorer` (lila-openingexplorer, from Phase 2)

Development uses the same compose file plus `mailpit` for email.

The explorer may move to its own disk-heavy host, with at least 2 TB NVMe,
with only a URL change in config.

Backups: a nightly `pg_dump` shipped off-box. The explorer's RocksDB is
rebuilt from source dumps rather than backed up.

## Context

The user chose this option (2026-10-10 session). MVP traffic is small. The
explorer needs local SSD and RocksDB, which serverless platforms can't host.
One provider and one compose file are the cheapest way to run the system and
the easiest to reason about. Containers stay portable to a managed platform
later.

## Alternatives rejected

- **AWS ECS Fargate + RDS (CDK)** — scalable, but more setup and cost than
  MVP needs. Revisit when traffic or availability needs grow.
- **Vercel + Neon + separate box** — three providers, and the worker and
  explorer still need a box.

## Consequences

- No horizontal scaling and no high availability. Accepted for MVP.
  Revisit when uptime targets or traffic require it.
- Secrets come from an untracked `.env` on the host:
  - DB password
  - auth secret
  - token-encryption key
  - SMTP credentials
- Only Caddy is exposed publicly. The explorer's admin `/import/*` routes are
  reachable only on the internal network.
- Postgres version and volume layout are pinned in compose. Upgrades are
  explicit tasks.
