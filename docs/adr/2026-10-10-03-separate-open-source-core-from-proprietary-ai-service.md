# Separate the open-source Core from the proprietary AI service

Date: 2026-10-10
Status: Accepted

## Decision

CheckMate is two systems. **CheckMate Core** (this repo, open source) holds
all non-AI chess functionality. **CheckMate AI** (Phase 4, separate private
repo and process) holds LLM orchestration, prompts, coaching methodology,
user modeling, multi-engine orchestration and engine-to-LLM context
construction. CheckMate AI talks to Core only through Core's versioned HTTP
API (`/api/v1`). It never reads Core's database. It never imports, links or
copies Core code or any GPL/AGPL library (including chessops); for rules and
positions it calls Core.

## Context

Core must be AGPL (2026-10-10-04-license-core-agpl-3-or-later). Proprietary
code stays clear of copyleft only when it runs as a separate program
communicating at arm's length over a network API. The brief requires the
boundary from day one, even though the AI service is not built until
Phase 4.

## Alternatives rejected

- **AI as a Core module or plugin** — becomes a derivative work of AGPL code;
  the proprietary IP would have to be published.
- **AI service reads Core's Postgres directly** — couples schemas, bypasses
  authz, and blurs the license boundary.
- **AI service embeds chessops/python-chess for rules** — both are GPL-3.0;
  also creates a second rules authority (violates
  2026-10-10-02-chess-software-is-sole-source-of-chess-truth).

## Consequences

- No prompts, coaching logic or LLM SDKs in this repo. Core may later host a
  thin, generic client UI for the AI API.
- Never put proprietary logic into adapted Lichess components.
- Core services take an explicit `userId` so Phase 4 service-to-service auth
  can call them without cookie sessions.
- Player data must be reachable through structured `/api/v1` endpoints by
  Phase 4 (see the core-architecture spec).
- Server-side engines (Stockfish, Lc0, Patricia) run in the AI service as
  separate, unmodified processes. Check their licenses before Phase 4.
- Formal licensing review before commercial deployment.
