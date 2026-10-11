# CheckMate docs map

Read this first. It lists every doc page and the conventions for this repo's
documentation system (ai-dev-docs).

## Start here if you're product / non-code

- [wiki/status.md](wiki/status.md): what works, what's next, open decisions
- [stream/2026-10-10-mvp-roadmap.plan.md](stream/2026-10-10-mvp-roadmap.plan.md): phases, milestones, exit scenarios, brief → requirement traceability

## Start here if you're driving an agent

- [wiki/architecture.md](wiki/architecture.md): system map, module boundaries, invariants (orientation page)
- [stream/2026-10-10-core-architecture.spec.md](stream/2026-10-10-core-architecture.spec.md): layout, `AnalysisProvider`, `ExplorerSource`, `/api/v1` conventions, authz, jobs
- [wiki/open-source-reuse.md](wiki/open-source-reuse.md): every dependency, dataset and asset, with its license, status and obligations. Check it before adding anything.
- [adr/](adr/): why things are the way they are (27 ADRs, 2026-10-10 and
  2026-10-11)
- [stream/2026-10-11-phase-1-implementation.plan.md](stream/2026-10-11-phase-1-implementation.plan.md): Phase 1 build order, file layout, per-milestone checks, and every SHOULD/COULD decision
- [stream/2026-10-11-m1.1-m1.4-build.plan.md](stream/2026-10-11-m1.1-m1.4-build.plan.md): detailed build plan for M1.1-M1.4 (board, analysis, editor, studies)

## Feature specs (`docs/stream/`)

| Phase | Spec |
|---|---|
| 1 | [p1-accounts-and-preferences](stream/2026-10-10-p1-accounts-and-preferences.spec.md) |
| 1 | [p1-ui-shell-and-design-system](stream/2026-10-10-p1-ui-shell-and-design-system.spec.md) |
| 1 | [ui-refresh](stream/2026-10-11-ui-refresh.spec.md) (supersedes the shell spec's Brand, `/` and desktop rail) |
| 1 | [p1-chessboard-component](stream/2026-10-10-p1-chessboard-component.spec.md) |
| 1 | [p1-pgn-fen](stream/2026-10-10-p1-pgn-fen.spec.md) |
| 1 | [p1-analysis-board](stream/2026-10-10-p1-analysis-board.spec.md) |
| 1 | [p1-board-editor](stream/2026-10-10-p1-board-editor.spec.md) |
| 1 | [p1-studies](stream/2026-10-10-p1-studies.spec.md) |
| 1 | [p1-puzzles](stream/2026-10-10-p1-puzzles.spec.md) |
| 2 | [p2-explorer-data-pipeline](stream/2026-10-10-p2-explorer-data-pipeline.spec.md) |
| 2 | [p2-opening-explorer](stream/2026-10-10-p2-opening-explorer.spec.md) |
| 3 | [p3-external-accounts-and-game-import](stream/2026-10-10-p3-external-accounts-and-game-import.spec.md) |
| 3 | [p3-game-library](stream/2026-10-10-p3-game-library.spec.md) |
| 3 | [p3-personal-opening-tree](stream/2026-10-10-p3-personal-opening-tree.spec.md) |
| 2 | [masters-data-permission-requests](stream/2026-10-10-masters-data-permission-requests.plan.md) (plan: email drafts + tracking) |
| 1 | [phase-1-implementation](stream/2026-10-11-phase-1-implementation.plan.md) (plan: build order M1.0-M1.6) |
| 1 | [m1.1-m1.4-build](stream/2026-10-11-m1.1-m1.4-build.plan.md) (plan: detailed build of M1.1-M1.4) |

## ADRs

| # | Decision |
|---|---|
| 01 | [record-architecture-decisions-as-adrs](adr/2026-10-10-01-record-architecture-decisions-as-adrs.md) |
| 02 | [chess-software-is-sole-source-of-chess-truth](adr/2026-10-10-02-chess-software-is-sole-source-of-chess-truth.md) |
| 03 | [separate-open-source-core-from-proprietary-ai-service](adr/2026-10-10-03-separate-open-source-core-from-proprietary-ai-service.md) |
| 04 | [license-core-agpl-3-or-later](adr/2026-10-10-04-license-core-agpl-3-or-later.md) |
| 05 | [typescript-monorepo-nextjs-and-node-worker](adr/2026-10-10-05-typescript-monorepo-nextjs-and-node-worker.md) |
| 06 | [postgres-drizzle-and-pg-boss](adr/2026-10-10-06-postgres-drizzle-and-pg-boss.md) |
| 07 | [chessops-is-the-rules-layer](adr/2026-10-10-07-chessops-is-the-rules-layer.md) |
| 08 | [single-chessground-board-component](adr/2026-10-10-08-single-chessground-board-component.md) |
| 09 | [browser-stockfish-behind-analysis-provider](adr/2026-10-10-09-browser-stockfish-behind-analysis-provider.md) |
| 10 | [better-auth-for-accounts-and-lichess-oauth](adr/2026-10-10-10-better-auth-for-accounts-and-lichess-oauth.md) |
| 11 | [raw-player-data-append-only-aggregates-derived](adr/2026-10-10-11-raw-player-data-append-only-aggregates-derived.md) |
| 12 | [lichess-puzzle-db-and-theme-taxonomy](adr/2026-10-10-12-lichess-puzzle-db-and-theme-taxonomy.md) |
| 13 | [study-chapters-stored-as-pgn](adr/2026-10-10-13-study-chapters-stored-as-pgn.md) |
| 14 | [self-hosted-opening-explorer-from-licensed-data](adr/2026-10-10-14-self-hosted-opening-explorer-from-licensed-data.md) |
| 15 | [personal-opening-tree-as-derived-postgres-index](adr/2026-10-10-15-personal-opening-tree-as-derived-postgres-index.md) |
| 16 | [docker-compose-on-single-vps](adr/2026-10-10-16-docker-compose-on-single-vps.md) |
| 17 | [self-administered-license-compliance](adr/2026-10-10-17-self-administered-license-compliance.md) |
| 18 | [import-own-chesscom-games-accepted-risk](adr/2026-10-10-18-import-own-chesscom-games-accepted-risk.md) |
| 19 | [curated-masters-set-deduped-by-terminal-position](adr/2026-10-10-19-curated-masters-set-deduped-by-terminal-position.md) |
| 2026-10-11-01 | [eslint-prettier-enforce-boundaries](adr/2026-10-11-01-eslint-prettier-enforce-boundaries.md) |
| 2026-10-11-02 | [analysis-sessions-are-mutable-working-copies](adr/2026-10-11-02-analysis-sessions-are-mutable-working-copies.md) |
| 2026-10-11-03 | [soft-launch-without-email-service](adr/2026-10-11-03-soft-launch-without-email-service.md) |
| 2026-10-11-04 | [shared-collaborative-studies-ops-over-pgn](adr/2026-10-11-04-shared-collaborative-studies-ops-over-pgn.md) |
| 2026-10-11-05 | [saved-browser-reviews-are-private-labelled-cache](adr/2026-10-11-05-saved-browser-reviews-are-private-labelled-cache.md) |
| 2026-10-11-06 | [self-hosted-syzygy-tablebase](adr/2026-10-11-06-self-hosted-syzygy-tablebase.md) |
| 2026-10-11-07 | [internal-packages-ship-typescript-source](adr/2026-10-11-07-internal-packages-ship-typescript-source.md) |
| 2026-10-11-08 | [mate-green-brand-accent](adr/2026-10-11-08-mate-green-brand-accent.md) |

## Conventions

- **Layers:**
  - `wiki/` = current truth, rewritten in place, never appended. One flat
    folder; frontmatter `kind: system | product | playbook | status`; pages
    under ~300 lines.
  - `adr/` = why. Append-only.
  - `stream/` = dated plans and specs. Append-only once their work
    concludes.
  - The wiki wins conflicts.
- **ADRs:**
  - Named `adr/YYYY-MM-DD-NN-slug.md`, 15-40 lines, format Decision /
    Context / Alternatives rejected / Consequences.
  - Never edit an accepted ADR. Supersede it, and reference by slug.
- **Stream items:**
  - Named `stream/YYYY-MM-DD-<topic>.<spec|plan|review|decision-record>.md`.
  - All specs and plans go here. This overrides any skill default such as
    `docs/specs/`.
  - Before build work on a spec starts, the spec may be refined in place.
    After that, changes go in a new dated item that supersedes the old one.
- **Requirement IDs:** `CORE-nn`, `P1-AC/UI/BD/PG/AN/ED/ST/PZ-nn`,
  `P2-EI/EX-nn`, `P3-IM/GL/OT-nn`. Code comments and tests may cite them.
- **Doc gate** (definition of done): affected wiki pages rewritten, ADR
  written for any ADR-worthy decision, `CLAUDE.md` synced if commands or
  rules changed, `wiki/status.md` touched if a milestone moved.
