# ESLint and Prettier enforce the module boundaries

Date: 2026-10-11
Status: Accepted

## Decision

ESLint (flat config, with `typescript-eslint` and `eslint-config-next`) checks
the code and Prettier formats it. Both run in CI and fail the build.

The architecture rules use ESLint's built-in `no-restricted-imports` with
per-folder overrides. No boundaries plugin.
- `packages/chess` may not import `packages/core`, `apps/*`, `node:*` or any
  I/O module (CORE-01, CORE-02).
- `apps/*` may not import a DB client (`drizzle-orm`, `pg`, `postgres`)
  except through `packages/core` (CORE-03).
- Only `<Board>` may import `@lichess-org/chessground` (P1-BD-11).
- Only the `AnalysisProvider` implementation may import `stockfish` (CORE-22).
- No file may import an LLM SDK (CORE-04, release checklist item 10).

DOM and Node *globals* are not imports, so the "no DOM, no Node APIs" half of
CORE-02 is enforced by `packages/chess/tsconfig.json`: `lib` without `DOM`,
and `types: []`. Using `window` or `process` there fails the typecheck.

## Context

The specs say these rules are "enforced by a lint rule" but named no tool.
The user chose ESLint + Prettier (2026-10-11). It is the Next.js default and
the setup most examples and agents assume.

## Alternatives rejected

- **Biome** — one fast tool, but no Next.js-specific rules and a smaller
  ecosystem.
- **eslint-plugin-boundaries** — another dependency to express rules that
  `no-restricted-imports` already covers.

## Consequences

- A new boundary rule is a new `no-restricted-imports` entry, not a plugin.
- Tools are registered in `docs/wiki/open-source-reuse.md`.
