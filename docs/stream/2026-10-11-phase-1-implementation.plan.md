# Plan: Phase 1 implementation (M1.0 → M1.6)

Date: 2026-10-11
Status: Approved

## Context

The repo holds docs only: specs, ADRs, wiki. Phase 1 ("Chess platform") is
specified. This plan turns the specs into a build order, a file layout and
checks for each milestone. The 2026-10-11 review with the user changed the
scope:
- **Studies:** Lichess parity minus chat (single-user tools, chapter modes,
  public/unlisted sharing, collaboration with live sync), all inside M1.4,
  before puzzles.
- **Accounts:** unique usernames from M1.0.
- **Every SHOULD/COULD has a decision** (table below), including two
  additions beyond the specs: a self-hosted endgame tablebase, and game
  reviews saved per account.

All of this goes into the docs before code (step 0), then into the doc gate
of each milestone. Specs are refined in place, which is allowed before a
spec's build starts (docs/index.md).

Sources of truth for each milestone:
- Roadmap: `docs/stream/2026-10-10-mvp-roadmap.plan.md:35-58`
- Contracts: `docs/stream/2026-10-10-core-architecture.spec.md`
- Specs: `docs/stream/2026-10-10-p1-*.spec.md`
- Register: `docs/wiki/open-source-reuse.md`
- Detailed build order for M1.1-M1.4 (files, tests, decisions taken while
  planning): `docs/stream/2026-10-11-m1.1-m1.4-build.plan.md`

## How the work runs

- **Commits go to `master`,** one or a few per milestone (user choice). The agent asks
  before the first push. CI runs on push.
- **Each milestone** runs in this order: build, then unit + e2e tests, then
  the doc gate, then commit. The doc gate covers wiki rewrites, ADRs,
  `CLAUDE.md`, `status.md` and register rows. A spec's detailed
  requirements, data model and API are written at the start of the milestone
  that builds it.
- **Before adding any dependency,** it gets a register row, and I check its
  API through Context7 at install time.
- **Prerequisites (local):** Node 24 LTS (the machine has 22.11, but pg-boss
  needs ≥22.12 and the worker uses Node 24 type stripping), plus corepack
  with pnpm 12 pinned via `packageManager`. A VPS is only needed at first
  deploy. Everything else runs in local Docker and CI.

### Step 0: record every decision in the docs (one docs commit, before code)

- **This plan** goes to `docs/stream/2026-10-11-phase-1-implementation.plan.md`.
- **Specs, short in-place edits** recording each decision below. Detail comes at milestone start.
  - **accounts:** P1-AC-01 adds a unique username:
    - Lichess rules: 2-20 characters from `[A-Za-z0-9_-]`, case-insensitive, unique, immutable.
    - Better Auth `username` plugin.
    - Display name stays.
    - MFA stays out.
  - **analysis:**
    - P1-AN-04 adds observation glyphs.
    - P1-AN-21 full-PGN link with a size check.
    - P1-AN-32/40-42: reviews are saved as a private labelled cache.
    - The tablebase moves from "Out" to "In" (new P1-AN-5x IDs).
  - **editor:** P1-ED-03 swap is in. P1-ED-11 history is marked **won't do**.
  - **studies:** scope becomes Lichess parity minus chat. P1-ST-12 becomes clone + "copy chapter to another study". PNG and GIF export are in.
  - **ui-shell:** the command palette is in, and the route map gains study browse and embed routes.
  - **core-architecture:**
    - CORE-43: specs now, OpenAPI at P4-prep.
    - CORE-44 stays out.
    - CORE-51 notes the study access gate.
- **New ADRs:**
  - `2026-10-11-04-shared-collaborative-studies-ops-over-pgn`: supersedes ADR 13's save model; covers public studies, SSE, custom PGN comment commands and usernames for invites.
  - `2026-10-11-05-saved-browser-reviews-are-private-labelled-cache`: refines ADR 09.
  - `2026-10-11-06-self-hosted-syzygy-tablebase`: covers 3-5 pieces now, a 6-piece volume next, and a 7-piece storage server as the upgrade path.
- **Roadmap:**
  - M1.2 adds the tablebase.
  - M1.2b becomes "saved game review".
  - M1.4 becomes Lichess parity.
  - Exit scenario 9: invite a contributor → live edits → sync → publish → view signed out.
  - Exit scenario 10: review a game → reload → the review is still there.
- **`CLAUDE.md` hard rule** "Never persist browser evals as truth" gets: saved reviews are private labelled caches (adr/2026-10-11-05).
- **Also:** `docs/index.md` (new ADRs) and `status.md` (decisions).

## SHOULD/COULD decisions (user, 2026-10-11)

| Item | Decision | Lands |
|---|---|---|
| P1-PG-23 export options | build | M1.1 |
| P1-UI-04 `/` command palette | build | M1.2 |
| P1-AN-33 free session after 1st move + 90-day purge | build | M1.2 |
| P1-AN-21 full-PGN share link | build: **size check first**; over the cap, a clear friendly message offers the FEN link or "share as study" | M1.2 |
| Tablebase (analysis spec "COULD later") | build, **self-hosted, no Lichess API**, 3-5 pieces now | M1.2 |
| P1-ED-03 swap colors | build | M1.3 |
| P1-ED-11 edit history in back/forward | **won't do**, never planned | — |
| P1-ED-12 open in editor · P1-ED-13 mobile palette | build | M1.3 |
| P1-ST-12 | duplicate = clone (B); "move chapter" → **copy chapter to another study** | M1.4 |
| P1-ST-13 remember position | build (Lichess parity) | M1.4 |
| PNG + GIF export (Lichess parity) | build, client-side | M1.4 |
| P1-PZ-23 retry failed puzzles | build | M1.5 |
| M1.2b game review | build, **saved per account and every run kept**; re-run on demand | after M1.5 |
| P1-UI-10 Geist/Lucide · P1-UI-11 sonner · CORE-23 fake provider | build | M1.0 / M1.2 |
| CORE-43 | endpoint docs in specs now; OpenAPI at P4-prep | ongoing |
| CORE-44 rules endpoints · MFA | ignore | — |

## Plan decisions (not in the specs, each recorded at its doc gate)

1. **Internal packages ship TS source, with no build step.** Next uses
   `transpilePackages`. The worker runs `node src/main.ts` on Node 24 type
   stripping (`erasableSyntaxOnly`, `.ts` import extensions,
   `rewriteRelativeImportExtensions`). It gets an ADR in M1.0 once the spike
   passes. Fallback: an esbuild bundle for the worker.
2. **The Better Auth instance lives in `packages/core/src/auth.ts`** (it needs the Drizzle adapter; CORE-03).
   - Sign-in and sign-up run client-side via `better-auth/react`.
   - Server code only calls `auth.api.getSession({ headers })`.
   - So there is no `nextCookies` plugin and no `proxy.ts`.
3. **Pure shared code goes in `@checkmate/core/shared`** (zod `/api/v1` schemas, preference allowlists). A lint rule forbids db imports there.
4. **Rate limiting** is on in every environment, with memory storage (one web container, ADR 16). The client IP comes from `X-Forwarded-For`, which is safe behind Caddy. E2E tests send a distinct XFF per test.
5. **Account deletion:** `DELETE /api/v1/me` wraps Better Auth `deleteUser`. FK cascades do the rest.
6. **`scripts/check-register.ts`** fails CI on:
   - an unregistered direct dependency (pattern rows allowed)
   - an unregistered asset directory
   - an LLM SDK
   - a license outside the allowlist

   It also writes `NOTICE` and `attributions.json` for `/about`. Both are committed, and CI runs `--check`.
7. **CI** uses GitHub Actions service containers (the same postgres and mailpit image tags as compose).
8. **Deletion coverage is self-maintaining:**
   - One test checks via `pg_constraint` that every `user_id` column has an FK to `user` with ON DELETE CASCADE.
   - A second test seeds one row per user-owned table, deletes the user, and asserts that zero rows remain. It fails if a table has no seeder.
9. **Puzzle import** uses only the stdlib: `fetch` → `zlib.createZstdDecompress` → `readline` → `split(',')`. Dev and CI import a committed sample of about 2k rows plus synthetic rows.
10. **Assets:**
    - Allowlisted lila pieces and sounds are copied once at a pinned commit and committed.
    - A script generates the piece CSS. Board themes are CSS two-color only.
    - Stockfish is copied into `public/engine/` by postinstall and loaded by URL.
11. **Test-only fake engine:** `?engine=fake` is honored only in builds with `NEXT_PUBLIC_E2E=1`.
12. **Study edits are server-applied tree operations, and PGN stays the stored format.**
    - The client posts ops. The server loads the chapter `FOR UPDATE`, applies the op with `TreeCursor`, writes the PGN, bumps the version and publishes the op.
    - Members receive ops over SSE. Pub/sub is an in-process `EventEmitter`. Ceiling: one web container; switch to Postgres `LISTEN/NOTIFY` if there is ever more than one.
    - This is the single write path, so P1-ST-05's whole-PGN autosave and its 409 go away. `PUT` stays only for "replace chapter".
13. **Data that standard PGN can't hold** goes in custom comment commands (`[%cm-hint]`, `[%cm-deviation]`, `[%cm-by]`). They are stripped on export unless "CheckMate extensions" is ticked.
14. **Saved reviews:**
    - Table `game_reviews`, append-only, one row per run: `user_id`, `line_key` = SHA-256 of the initial FEN + mainline UCI, provenance, depth, per-ply evals/classification/best move, summary, `created_at`.
    - The latest run is shown, with a picker for earlier ones. Always labelled "Browser review · Stockfish 19 Lite · depth N · date".
    - Never read by anything except the owner's review UI.
15. **Tablebase:**
    - An unmodified upstream lila-tablebase container, built from source at a pinned commit, internal only.
    - The 3-5 piece tablebase files sit on a read-only volume, downloaded by `scripts/fetch-tablebases.sh` from a non-Lichess mirror with checksum verification.
    - `/api/v1/tablebase?fen=` validates the FEN through `packages/chess`, queries only positions with ≤ the configured piece count, and labels results "Tablebase".
16. **PNG/GIF export:** `components/board/board-image.ts` draws a position to canvas from the same piece and board assets. PNG for the position, GIF of the mainline via `gifenc` (MIT, new register row). No server service.

## Repository layout (end of Phase 1)

```
package.json · pnpm-workspace.yaml · turbo.json · tsconfig.base.json · eslint.config.mjs
.prettierrc · .gitignore · .nvmrc · .env.example · LICENSE (AGPL-3.0) · NOTICE (generated)
docker-compose.yml · Caddyfile · .github/workflows/ci.yml
scripts/  check-register.ts · fetch-lila-assets.sh · fetch-tablebases.sh · gen-piece-css.ts · gen-openings.ts · copy-stockfish.ts
services/tablebase/  Dockerfile (lila-tablebase @ pinned commit)
apps/web/       next.config.ts · Dockerfile · playwright.config.ts · e2e/*.spec.ts
  src/app/      routes per ui-shell route map (+ study browse/embed) · api/auth/[...all] · api/v1/**
  src/components/  ui/ · shell/ · board/ (Board.tsx = only chessground importer, board-image.ts) · analysis/ · editor/ · studies/ · puzzles/ · pgn/
  src/lib/      api.ts · auth-client.ts · prefs.tsx · use-game-tree.ts · use-autosave.ts · use-shortcuts.ts · sound.ts · study-live.ts
  src/engine/   browser-stockfish.ts (only UCI parser)
  src/workers/  pgn-index.worker.ts
apps/worker/    Dockerfile · src/main.ts · src/jobs/*.ts
packages/chess/ src/{fen,moves,keys,pgn,tree,analysis,advice,openings,editor,puzzle,study-ops}.ts · src/data/ · fixtures/ · test/
packages/core/  drizzle.config.ts · drizzle/ · src/{db,auth,email,errors,migrate,pubsub}.ts
                src/schema/*.ts · src/services/**.ts · src/shared/*.ts · test/ · bench/
```

## M1.0 Scaffold

1. **Workspace:**
   - root files
   - ESLint flat config with every boundary rule: chess isolation, no DB client in apps, chessground only in `components/board/Board.tsx`, `stockfish` only in `src/engine/`, LLM denylist, no db in `core/shared`
   - Prettier
   - `packages/chess/tsconfig.json` with no DOM `lib` and `types: []`
2. **`packages/core`:**
   - `db.ts` (drizzle on `pg`)
   - Schema: Better Auth tables (with the `username` plugin), `user_preferences`, `external_accounts`.
   - Migrations via drizzle-kit; `migrate.ts`.
   - `services/preferences.ts`, `services/account.ts`, `email.ts` (nodemailer, or the log fallback), `errors.ts` (`DomainError`).
   - Auth config:
     - min password length 10, `haveIBeenPwned`, username rules
     - `requireEmailVerification: false`
     - verification and reset emails (3600 s)
     - `revokeSessionsOnPasswordReset`
     - 7-day rolling sessions with no cookie cache
     - `deleteUser.enabled`
     - rate limit on
3. **`apps/web`** (`create-next-app` + `shadcn init`):
   - Brand OKLCH tokens, `next-themes`, Geist, Lucide, sonner, `StateView`.
   - Shell: nav rail on desktop, tab bar on phone; unshipped routes hidden; footer with Source (`github.com/Rathetsu/check-mate/tree/<sha>`) and About links.
   - Routes:
     - `/`
     - `/auth/*`; sign-up asks for username, display name, email and password
     - `/settings/*`
     - `/about`, `/privacy`, `/source`
   - API: `api/auth/[...all]`, `/api/v1/me` (GET, DELETE), `/api/v1/me/preferences`, all through the `lib/api.ts` wrapper.
   - `PrefsProvider`.
4. **`apps/worker`:** `main.ts` starts pg-boss, registers the job list (empty for now) and shuts down on SIGTERM.
5. **Compose:**
   - `postgres:16` (pinned, with volume)
   - a one-shot `migrate` service
   - `web` (`COMMIT_SHA` build arg)
   - `worker`
   - `caddy`
   - `mailpit` (profile `dev`)
   - `.env.example`
6. **Register and CI:**
   - Add missing rows: `pg`, `typescript`, `@types/*`, shadcn runtime deps, `@tailwindcss/postcss`, `@playwright/test`, `@axe-core/playwright`, `@better-auth/cli`.
   - CI order: lint → format:check → typecheck → check:register → migrate → vitest → build → playwright.
7. **Tests:**
   - Vitest: `sendEmail` fallback; preferences + cross-user; both deletion tests; `boundaries.test.ts` (ESLint `lintText`).
   - Playwright (Mailpit API): the full auth flow; a duplicate username is rejected (case-insensitive); preferences persist and signed-out users get defaults; deleting the account works; 20 sign-ins return 429; Source SHA link; `/privacy` linked from sign-up.
8. **Doc gate:** `CLAUDE.md` Commands, verify `architecture.md`, ADR (decision 1), `status.md`.

## M1.1 Board + rules + PGN/FEN

1. **`packages/chess`:**
   - `fen.ts`: parse, make, `validateSetup` reasons, 4/5/6-field FENs, URL `_`.
   - `moves.ts`: `legalDests`, `applyUci`, `applySan`, `toSan`, `gameStatus(position, history)`.
   - `keys.ts`: `positionKey`.
   - `pgn.ts`:
     - parse with quirks, streaming `indexPgn`
     - comment commands, with `%cm-*` preserved
     - error mapping
     - limits
     - `makePgn` with the **P1-PG-23 options**
     - `importedEval`
   - `tree.ts`: `TreeCursor`. Node ids come from the UCI.
   - `analysis.ts`: `AnalysisProvider` + types + **`createFakeProvider()`**.
   - `fixtures/` + README.
   - Tests: corpus round-trip, malformed fixtures, TreeCursor, `positionKey`.
2. **`apps/web`:**
   - `Board.tsx`, per the chessboard spec
   - assets
   - `use-game-tree.ts`, `sound.ts`
   - PGN import/export primitives with the export-options checkboxes; `pgn-index.worker.ts`
   - a minimal `/analysis`
3. **Tests:**
   - Playwright: the chessboard and PGN criteria.
   - The 5 MB / 3,000-game paste lists in under 3 s with no long task over 200 ms.
4. **Known risk:** chessops gives no line/column, so plan for our own offset tracking. Check first.

## M1.2 Analysis + engine + tablebase

1. **`AnalysisBoard`** (reused by studies):
   - move list
   - context menu
   - glyph bar (move / position / **observation**, from lila `Glyph.scala`) and comment box
   - game status
   - opening name (`classifyLine` over JSON generated from chess-openings at a pinned commit)
   - shortcuts + `?` help
   - **`/` command palette** (shadcn Command/`cmdk`, new register row): jump to a route, flip, toggle the engine, import PGN
2. **Engine:**
   - `browser-stockfish.ts` (Worker, UCI, MultiPV, stale-result guard, lite/full, threads when isolated, provenance, stop on hide, error state)
   - engine panel, eval bar, settings, best-move arrow
   - COOP/COEP on engine routes only
   - `nav-link.tsx` uses a plain `<a>` across the engine-route boundary
3. **Tablebase** (decision 15):
   - `services/tablebase/Dockerfile` and a compose `tablebase` service on the internal network
   - `fetch-tablebases.sh`
   - core `services/tablebase.ts`
   - `/api/v1/tablebase`
   - an analysis panel section showing the result (win/draw/loss + DTZ) and per-move outcomes, with click-to-play, shown only when the piece count is covered
4. **Sessions:**
   - `analysis_sessions` schema, service and API
   - `use-autosave.ts`
   - **P1-AN-33:** a session is created on the first move, and a worker job `analysis-sessions:purge-free` runs daily for free sessions older than 90 days
5. **Load/export/share:**
   - FEN link.
   - **Full-PGN link:** compress the PGN into the URL hash, check the length *before* offering it, and over the cap show a plain message ("This analysis is too big to fit in a link") with buttons for the FEN link or "Save as study and share".
6. **Tests:**
   - Playwright:
     - the analysis criteria
     - the PGN link over the cap shows the message
     - tablebase on a KRvK position (CI uses a tiny cached table set: KRvK, KQvK)
     - command palette actions
   - Vitest: the UCI parser, the tablebase service (FEN validation, piece-count gate).

## M1.3 Board editor

- **`packages/chess/src/editor.ts`:** castling and en passant availability adapted from lila `ui/editor` (AGPL header), FEN assembly, and **swap colors**. Unit test: 20-setup table.
- **Board free mode:** `<Board mode="free">` gains spare pieces and delete on drop-off.
- **Editor UI:** `/editor` pages, tools, options, two-way FEN field, inline reasons, URL sync (no history walking, P1-ED-11 won't do).
- **Phone layout:** the palette is a scrollable row with tap-to-place (P1-ED-13).
- **Actions:** Analyze is disabled while invalid ("Continue from here" is won't do, 2026-10-11). "Open in editor" is added to analysis (P1-AN-23/ED-12).
- **Playwright:** the editor criteria, the FEN round trip, and swap colors.

## M1.4 Studies: Lichess parity minus chat (+ P1-AN-22, P1-ED-10)

Three slices, each committed separately. Roughly 3-4 weeks.

### 4.0 Docs

- Write the full studies spec requirements, data model, API and acceptance criteria for A/B/C.
- **Open points to settle there:**
  - When a member deletes their account, do their comments stay as "deleted user" or get removed?
  - Do invites need acceptance (recommended) or add the member directly?
  - What is the formula for the "hot" sort?
- Update `/privacy` (public studies, usernames) and the register (Lichess game export use, `gifenc`).

### 4.1 Single-user parity

- **core:**
  - Schema:
    - `studies`: visibility, settings jsonb, topics, position, likes_count
    - `study_chapters`: description, mode, conceal_ply, version
  - `services/studies.ts`:
    - CRUD
    - one `createChapters` for every source: empty, FEN, PGN, Lichess game URL, puzzle in M1.5
    - limits
    - `applyOps`
    - reorder
    - clear annotations/variations
    - export
    - **copy chapter to another study** (respects the 64-chapter limit)
  - **`studyAccess(userId | null, studyId)`** is the single gate, and `none` → 404.
- **packages/chess:** `study-ops.ts` (op types + `applyOp`) and `advice.ts` (win chances + Advice port from lila, header with commit).
- **web** (`/studies/[id]/[chapterId]` hosts `AnalysisBoard` with an ops adapter):
  - Panels: chapter list (search, rename, reorder, delete, copy to study, next chapter), descriptions, PGN tag editor.
  - New-chapter dialog.
  - Multiboard.
  - Share menu: links, PGN, FEN, **PNG, GIF** (decision 16).
  - Chapter modes: Hide next moves, Interactive lesson (authoring + play), Practice with computer (`getBestMoves` + `advice.ts`).
  - Elsewhere: remembered position, "Save to study", "Save as study chapter".
- **Tests:**
  - Vitest: `applyOp` round-trip; custom commands survive and are stripped on plain export; Advice constants; limits; illegal move → 400 + ply; cross-user 404; copy-chapter limit.
  - Playwright: the spec flow; each mode; game URL (stubbed); PNG/GIF downloads are produced.

### 4.2 Sharing

- **Visibility and settings:** public / unlisted / private; settings enforced in `studyAccess`; signed-out read-only view.
- **Clone** (= P1-ST-12 duplicate).
- **Likes, topics, browse:** `study_likes`; topics; `/studies` tabs (mine / member / liked / public) with sorts, topic pages and `pg_trgm` search.
- **Embed:** `/embed/study/...` with no engine, no COOP/COEP, and `frame-ancestors *`.
- **Tests:** visibility matrix, clone setting, embed headers, the likes seeder.

### 4.3 Collaboration

- **Members and invites:** `study_members` (contributor / viewer); invites by username listed in-app; kick, leave; `cm-by` authorship.
- **Live updates:** `study-live.ts` reads SSE (ordered ops, refetch on a version gap); presence; **sync** follows contributors' navigation, and newcomers land at `studies.position`.
- **Tests:**
  - Vitest: concurrent ops serialize with no lost updates; a viewer can't apply ops; a removed member gets 404.
  - Playwright, with two contexts: invite → accept → live edits → sync → viewer is read-only.

## M1.5 Puzzles (+ "From puzzle" chapters)

- **packages/chess `puzzle.ts`:** `isCorrectMove` (lila `moveTest.ts` port) and `puzzleToPgn`.
- **core:** `puzzles`, `puzzle_attempts`, `puzzle_attempt_moves`, `ingestion_runs`; import, selection, attempts and history services; `themes.ts`; theme counts in `ingestion_runs.details`.
- **Selection** includes **`mode: 'retry_failed'`** (P1-PZ-23): the user's failed or solved-with-mistakes puzzles in the theme, least recent first.
- **worker:** `jobs/puzzles-import.ts` (monthly + manual, `PUZZLES_SOURCE_URL`) and `jobs/puzzle-attempts-sweep.ts` (hourly).
- **API:** exactly as in the puzzles spec (signed-in: server-authoritative; anonymous: client validates).
- **web:** `/puzzles` (grid, band, "Retry failed" toggle), the solving page and result card, `/puzzles/history`, the "From puzzle" chapter source.
- **Benchmark:** p95 < 100 ms on a full local import, recorded in a stream review.
- **Playwright:** the puzzle criteria plus a retry-failed run.

## M1.2b Saved game review (after M1.5)

- **Engine pass:** "Review game" runs `evaluateLine` at depth 18 with progress and cancel, then classifies with `advice.ts`.
- **Display:** glyphs, best alternatives, and a per-player summary.
- **Saving** (decision 14): each run is saved as a new `game_reviews` row. Opening the same mainline later, from analysis, a study chapter or an uploaded PGN, shows the latest run straight away, with a picker for earlier runs and a "Re-run" (choose depth) button. Export as labelled `[%eval]` comments.
- **API:** `POST /api/v1/game-reviews`; `GET /api/v1/game-reviews?line_key=`.
- **Tests:**
  - Vitest: `line_key` is stable across sources; cross-user 404; the deletion seeder covers `game_reviews`.
  - Playwright: review → reload → still there with no recompute; a re-run adds a second run to the picker.

## M1.6 Polish + Phase 1 exit

- **Playwright per route** (including public study, browse and embed):
  - visual pass at 375/768/1440 in light and dark
  - axe: zero serious or critical violations
  - touch targets ≥ 44px
- **P1-UI-14 test:** reserved colors never use `primary`.
- **Engine smoke on WebKit and Firefox.**
- **Exit suite:** `e2e/exit/phase1.spec.ts` covers roadmap scenarios 1-8 plus the new 9 and 10.
- **Wrap-up:** walk the release compliance checklist and update `status.md` (Phase 1 done). The first soft-launch deploy (renting the VPS) is a separate task, on your call.

## Verification (every milestone)

- `pnpm lint && pnpm format:check && pnpm typecheck && pnpm check:register && pnpm test && pnpm e2e` pass locally against `docker compose up -d postgres mailpit` (+ `tablebase` from M1.2). CI is green after the push.
- `docker compose up` behind Caddy at `https://localhost`: use the milestone's feature by hand once. For M1.4.3 that means two browsers with live edits and sync, which also checks SSE through Caddy.
- The roadmap "Done when" column (roadmap:37-46) is checked off. Each MUST maps to a test or to a manual check recorded in the stream.
- Phase 1 is done when the exit suite passes in CI.

## Risks to check early

| Risk | Milestone | Fallback |
|---|---|---|
| Node type stripping across workspace symlinks, plus `.ts` import extensions in Next | M1.0 | esbuild bundle for the worker |
| Better Auth IP header behind Caddy and in e2e | M1.0 | `advanced.ipAddress` config |
| chessops gives no PGN line/column | M1.1 | our own token offset tracking |
| stockfish 19.0.1 build file names | M1.2 | read `node_modules/stockfish` at install |
| Tablebase mirror offline | M1.2 | alternate mirror (the files are free to use, owner 2026-10-11) |
| lila-tablebase has no published Docker image or documented flags | M1.2 | build from source; read `--help` at the pinned commit |
| SSE through Caddy (buffering, idle timeouts) | M1.4.3 | heartbeats every 15 s; Caddy `flush_interval -1` |
| Parse+write PGN per op is too slow on 500 KB chapters | M1.4.1 | cache the parsed tree per chapter in-process, keyed by version |
| `zlib.createZstdDecompress` status in Node 24 | M1.5 | `zstd` CLI in the worker image |
| Puzzle selection p95 on 6.16M rows | M1.5 | partial indexes per band, or a theme+band bucket |

## Build notes

### M1.0 (2026-10-11)

What changed against this plan while building:
- **`packages/chess` starts in M1.1,** where it first has code. The DOM-free
  tsconfig check lands with it. The lint boundaries for it are already in
  `eslint.config.mjs` and tested.
- **Better Auth tables are written by hand** in `packages/core/src/schema/auth.ts`,
  matching the 1.7 generator's output. The `@better-auth/cli` dependency
  isn't needed.
- **Sign-in accepts email or username** (Lichess parity). It's a small
  addition to P1-AC flow 2 and has the same rate limit.
- **Versions:**
  - PostgreSQL 18.6, not 16 (ADR 06 says 16+).
  - TypeScript pinned to 6.0.x, because typescript-eslint doesn't support 7
    yet.
  - shadcn style `radix-nova`, whose `cn` package replaces clsx +
    tailwind-merge.
- **License allowlist:** gains `LGPL-3.0-or-later`, for sharp's libvips via
  Next.js image optimization.
- **`/privacy` contact:** GitHub issues, so no personal email is published.
  Swap in a contact address when one exists.
- **Dev tooling:**
  - Next's dev indicator is off, because it covered the nav rail's account
    button.
  - Playwright can use a local Chrome (`PW_CHANNEL=chrome`) when its browser
    download is blocked.

### M1.1 (2026-10-11)

Built per docs/stream/2026-10-11-m1.1-m1.4-build.plan.md. What changed while
building (details in the chessboard and pgn-fen spec build notes):
- **Piece sets: 11.** `staunton` is not a 2D set in lila (3D sprites only),
  and the 2D `staunty` is CC BY-NC-SA. It is removed from the allowlist, the
  spec and the register.
- **PGN splitting rules** for files without tags or with stray blank lines,
  and an unclosed `{` no longer swallows the rest of the file.
- **Leading comments:** a variation's leading comment moves onto the parent
  when that variation becomes the mainline move. PGN can't hold it there,
  and browser and server trees must match for M1.4.
- **The game picker renders 200 rows at a time.** Rendering 3,000 rows at
  once was a long task on the main thread.
- **Benchmarks:**
  - 5 MB / 3,048 games listed in about 0.8 s with no long tasks
  - 20,000-node parse + write in about 167 ms (M1.4 decides on lazy
    `fen`)
- **Move numbers of 10,000 or more:** chessops reads "10000." as the null
  move `0000`. The node-limit test writes its moves without numbers.

### M1.2 (2026-10-11)

Built per docs/stream/2026-10-11-m1.1-m1.4-build.plan.md. What changed while
building (details in the analysis and ui-shell spec build notes):
- **Side panel:** engine and tablebase sit above the tabs (Moves · Annotate
  · Info), so engine lines stay visible while moving. On phones the panel
  stacks under the board; no bottom sheet.
- **COEP reaches workers:** an isolated page can only start a worker whose
  script also sends COEP. `/engine/*` and `/_next/static/*` send COEP + CORP.
- **Device settings:** engine threads, hash and the best-move arrow are kept
  per browser, not per account (they depend on the machine).
- **Sessions gain `last_path`,** so a reload resumes on the same move.
- **Web image fix:** the runtime image now copies `public/` (pieces,
  sounds, engine). M1.1's image left it out.
- **The tablebase image** builds lila-tablebase itself; upstream's
  Dockerfile switches to a user it never creates. The mirror's HTTPS
  certificate has lapsed, so `fetch-tablebases.sh` downloads over HTTP and
  checks every file against an md5 list whose SHA-256 is pinned.
- **Long-task check:** CI runs 10 s; the full 60 s is
  `LONGTASK_SECONDS=60 pnpm e2e -g "long tasks"` (passed once locally, no
  nightly job yet).
- **e2e:** the engine starts off for signed-out test pages unless a test
  opts in (`test.use({ engine: true })`), so parallel tests don't compete
  for CPU.

### M1.3 (2026-10-11)

Built per the M1.1-M1.4 build plan; details in the board-editor spec build
notes.
- **One editor file per side:** `packages/chess/src/editor.ts` (state,
  availability, FEN, swap) and `apps/web/src/components/editor/editor.tsx`
  (palettes, options, FEN field, validation). The plan's four component
  files became one.
- **Phone layout fix:** the palette row must not set the column's minimum
  width, or the page scrolls sideways at 375 px.
