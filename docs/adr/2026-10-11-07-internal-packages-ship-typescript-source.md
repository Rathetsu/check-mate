# Internal packages ship TypeScript source, with no build step

Date: 2026-10-11
Status: Accepted. Refines 2026-10-10-05-typescript-monorepo-nextjs-and-node-worker.

## Decision

`packages/*` publish their TypeScript source through `package.json`
`exports` (for example `"./shared": "./src/shared/index.ts"`). Nothing
compiles them:
- `apps/web`: Next.js transpiles them (`transpilePackages`).
- `apps/worker` and scripts: Node 24 runs the `.ts` files directly through
  built-in type stripping (`node src/main.ts`).
- Vitest and drizzle-kit load TypeScript themselves.

To keep this working, `tsconfig.base.json` sets `erasableSyntaxOnly` (no
enums, namespaces or parameter properties), `verbatimModuleSyntax` and
`allowImportingTsExtensions`. Relative imports spell out the `.ts` extension.

## Context

ADR 05 left the worker's consumption open ("compiled or bundled"). The
M1.0 spike (2026-10-11) showed both halves work:
- Node 24 strips types in workspace packages. pnpm symlinks resolve to real
  paths outside `node_modules`, where type stripping is allowed.
- Next 16 resolves the `.ts` imports inside the transpiled package.

That means no build step, no `dist/` to keep in sync, and the worker image runs
the same files the tests ran.

## Alternatives rejected

- **`tsc` to `dist` per package** — a build graph and watch mode for no
  runtime gain.
- **Bundling the worker with esbuild or tsup** — another tool and another
  dependency. It stays the fallback if type stripping ever falls short.
- **tsx** — a runtime dependency for what Node 24 does natively.

## Consequences

- TypeScript features that need emit (enums, parameter properties) are
  compile errors. Use union types and explicit fields.
- The worker and migrate images run Node 24 or newer.
- Next.js dev forwards Node flags through `NODE_OPTIONS`, which rejects
  `--env-file-if-exists`. The web app loads the root `.env` with
  `process.loadEnvFile` in `next.config.ts` instead.
