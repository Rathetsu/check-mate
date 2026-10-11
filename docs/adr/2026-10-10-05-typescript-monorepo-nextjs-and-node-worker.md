# TypeScript monorepo: Next.js web app plus a Node worker

Date: 2026-10-10
Status: Accepted

## Decision

One pnpm + Turborepo monorepo, TypeScript everywhere:

- `apps/web` — Next.js 16 App Router. Serves the UI, the versioned
  `/api/v1` route handlers, and server actions.
- `apps/worker` — Node 24 LTS process running background jobs.
- `packages/chess` — pure chess logic, no I/O.
- `packages/core` — DB schema plus domain services.

UI uses Tailwind CSS 4 and shadcn/ui. Tests use Vitest (units) and Playwright
(e2e). The same rules library runs in the browser and on the server.

## Context

Reused chess code is TypeScript (chessground, chessops) or a standalone Rust
service (lila-openingexplorer, run as a container). A TS backend lets the
worker validate imported PGN with the exact rules library the board uses. The
brief prefers React/Next.js/TS/Tailwind/shadcn. Versions were current on
2026-10-10: Next 16.4, Tailwind 4.3, shadcn CLI 4.21, Vitest 5, Playwright
1.64.

## Alternatives rejected

- **Reuse lila's Scala backend** — brings Mongo, multiplayer, tournaments and
  ratings infrastructure the brief explicitly excludes.
- **Separate Fastify/Nest API service** — a second deployable with no MVP
  benefit; route handlers already give a versioned HTTP API for Phase 4.
- **Python backend** — splits the rules layer across two libraries
  (python-chess is GPL anyway); loses shared types.

## Consequences

- Dependency direction: `packages/chess` ← `packages/core` ← `apps/*`. Apps
  never query the DB except through `packages/core`.
- `packages/chess` stays free of I/O so the browser, server and worker can
  all import it.
- Next 16 specifics: use `proxy.ts` (`middleware.ts` is deprecated), and
  `params`, `cookies()` and `headers()` are async.
- Next.js can't test async Server Components in Vitest; cover them with
  Playwright.
- The worker consumes internal packages compiled (`tsc` to `dist`) or bundled.
