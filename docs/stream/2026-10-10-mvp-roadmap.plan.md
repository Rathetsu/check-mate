# Plan: CheckMate MVP roadmap (Phases 1-3)

Date: 2026-10-10
Status: Approved

## Goal

Ship CheckMate Core in three sequential phases. Each phase is fully usable
without any LLM. Phase 4 (CheckMate AI) does not start until it is
separately specified.

Sequencing rule: a phase starts only when the previous phase's exit
scenarios pass. Within a phase, milestones run in order unless marked
parallel.

## Spec index

| Spec | Milestones |
|---|---|
| 2026-10-10-core-architecture.spec.md | all (contracts) |
| 2026-10-11-phase-1-implementation.plan.md | M1.0-M1.6 (build order, file layout, per-milestone checks) |
| 2026-10-10-p1-accounts-and-preferences.spec.md | M1.0 |
| 2026-10-10-p1-ui-shell-and-design-system.spec.md | M1.0, M1.6 |
| 2026-10-10-p1-chessboard-component.spec.md | M1.1 |
| 2026-10-10-p1-pgn-fen.spec.md | M1.1 |
| 2026-10-10-p1-analysis-board.spec.md | M1.2, M1.2b |
| 2026-10-10-p1-board-editor.spec.md | M1.3 |
| 2026-10-10-p1-studies.spec.md | M1.4 |
| 2026-10-10-p1-puzzles.spec.md | M1.5 |
| 2026-10-10-p2-explorer-data-pipeline.spec.md | M2.1, M2.3 |
| 2026-10-10-p2-opening-explorer.spec.md | M2.1, M2.2, M2.4, M2.5 |
| 2026-10-10-p3-external-accounts-and-game-import.spec.md | M3.1, M3.2 |
| 2026-10-10-p3-game-library.spec.md | M3.3 |
| 2026-10-10-p3-personal-opening-tree.spec.md | M3.4, M3.5 |

## Phase 1: Chess platform

| Milestone | Content | Done when |
|---|---|---|
| M1.0 Scaffold | monorepo, compose (web, worker, postgres, caddy, mailpit), CI on GitHub Actions (ESLint + Prettier, typecheck, Vitest, Playwright, register check), AGPL `LICENSE`, `NOTICE`/`/about` from the reuse register, footer Source link, `/privacy` page, brand tokens (Mate Violet), Better Auth (`sendEmail` with log fallback, unique usernames), preferences, app shell + theme | register/sign-in e2e green in CI; verification and reset e2e via Mailpit |
| M1.1 Board + rules + PGN/FEN | `packages/chess`, `<Board>`, `TreeCursor`, PGN/FEN library + fixture corpus | chessboard and PGN/FEN acceptance criteria |
| M1.2 Analysis + engine + tablebase | analysis board, browser Stockfish provider, sessions, command palette, self-hosted Syzygy tablebase (3-5 pieces) | analysis acceptance criteria, except P1-AN-22 (moves to M1.4) and P1-AN-40..43 (M1.2b) |
| M1.2b Saved game review (runs after M1.5) | per-ply review, classifications, saved per user with every run kept (2026-10-11-05) | P1-AN-40..43 |
| M1.3 Board editor | editor | editor acceptance criteria, except "Save as study chapter" in P1-ED-10 (moves to M1.4) |
| M1.4 Studies (Lichess parity minus chat) | studies CRUD + chapters + export; single-user tools and chapter modes; sharing (public/unlisted, clone, likes, topics, browse, embed); collaboration (members, live sync) (2026-10-11-04); analysis "Save to study" (P1-AN-22); editor "Save as study chapter" (P1-ED-10) | studies acceptance criteria, except "From puzzle" in P1-ST-02 (moves to M1.5) |
| M1.5 Puzzles | import job, theme catalog, solving, attempts, history; study chapter "From puzzle" (P1-ST-02) | puzzles acceptance criteria |
| M1.6 Polish | responsive pass, a11y (axe), asset allowlist check, performance | UI shell acceptance criteria |

**Phase 1 exit scenarios** (Playwright, from brief §5 deliverables):
1. Create an account, sign in, and verify the email through the Mailpit
   link (P1-AC; verification is not required to use the app).
2. Open `/analysis`, play moves, branch a variation, annotate (P1-AN, P1-BD).
3. Turn on Stockfish and get an eval with provenance (P1-AN-10..18).
4. Import a multi-game PGN, export PGN and FEN (P1-PG).
5. Build a position in the editor and open it in analysis (P1-ED).
6. Create a study with 3 chapters, edit, reload, and confirm persistence
   (P1-ST).
7. Solve fork puzzles; history shows the attempts (P1-PZ).
8. Navigate every route on phone and desktop with no dead ends (P1-UI).
9. Invite a second user as a contributor. Both see edits live, sync follows
   navigation, then publish the study and view it signed out (P1-ST,
   2026-10-11-04).
10. Review a game, reload, and the saved review is still there with no
    recompute (P1-AN-43).

Milestone order: M1.0 → M1.1 → M1.2 → M1.3 → M1.4 → M1.5 → M1.2b → M1.6
(M1.2b needs the move classifier that M1.4 builds for practice mode).

## Phase 2: Unified opening explorer

| Milestone | Content | Done when |
|---|---|---|
| M2.1 Explorer service + ECO | explorer container, Lichess-dump ingestion + sizing review, `/api/v1/explorer`, classifier | sizing review written; API returns lichess stats + opening names |
| M2.2 Explorer UI | panel on all board pages + `/explorer` | P2-EX-30..39 |
| M2.3 OTB pipeline | source registry, broadcasts ingestion, terminal-position dedup, masters import (manual batches), monthly CC BY-SA dump on `/about/data` | pipeline acceptance criteria |
| M2.4 Unified + masters | "All" merge, per-source breakdown, master game viewer + search, compare view, add to study | explorer acceptance criteria |
| M2.5 (COULD) | `lichess-account` source | only if requested |

**Phase 2 exit scenarios** (brief §6 deliverables):
1. Explore openings by clicking moves (P2-EX-31).
2. See W/D/L and game counts per move (P2-EX-31).
3. Open a master game in analysis (P2-EX-34, P2-EX-16).
4. Apply rating, speed and date filters; an unsupported source is flagged
   (P2-EX-11, P2-EX-32).
5. Compare Lichess vs Masters (P2-EX-33, P2-EX-37).
6. Jump explorer → analysis with the engine (P2-EX-35, P2-EX-38).
7. Add an explored position to a study (P2-EX-35).

## Phase 3: Personal chess database

| Milestone | Content | Done when |
|---|---|---|
| M3.1 Linking | Lichess OAuth link, Chess.com username link, unlink | P3-IM-01..07 |
| M3.2 Import + sync | jobs, normalization, failures, retry, PGN upload, progress UI | import acceptance criteria |
| M3.3 Library | `/games`, detail view | library acceptance criteria |
| M3.4 Tree + performance | `game_positions`, classification, tree query, `/openings` | P3-OT-01..34 |
| M3.5 My Games source + compare | `me` ExplorerSource, compare view | P3-OT-40..42 |

**Phase 3 exit scenarios** (brief §7 deliverables):
1. Connect Lichess (P3-IM-01).
2. Connect Chess.com (P3-IM-02).
3. Import both histories, with progress shown (P3-IM-10..14).
4. Reload a week later and the games are still there (P3-IM-14,
   persistence).
5. Sync adds only new games (P3-IM-15).
6. Browse and filter the library (P3-GL-01..07).
7. Generate the personal tree (P3-OT-10..23).
8. Filter by color, platform, rating, speed and date (P3-OT-10, P3-OT-21).
9. Compare My Games vs Lichess/Masters (P3-OT-40).
10. Open any imported game in analysis (P3-GL-10).

## Traceability: brief → requirements

| Brief section | Covered by |
|---|---|
| §2 Chess engines are source of truth / follow-up §2 | ADR 02 · CORE-10, CORE-20..22 · P1-PG-40 · P2-EX-21 |
| §3 Reuse, don't reinvent; document reuse | ADR 04 · each spec's Reuse table · `docs/wiki/open-source-reuse.md` |
| §4 UI/UX | P1-UI-01..12 |
| §5.1 Accounts | P1-AC-01..12 |
| §5.2 Chessboard | P1-BD-01..25 · ADR 08 |
| §5.3 Analysis board | P1-AN-01..33 · ADR 09 |
| §5.4 Board editor | P1-ED-01..13 |
| §5.5 PGN/FEN | P1-PG-01..40 |
| §5.6 Studies | P1-ST-01..13 · ADR 13 |
| §5.7 Learning tools / follow-up §3 puzzles | P1-PZ-01..51 · ADR 12 |
| §6.1-6.2 Explorer features | P2-EX-30..39 |
| §6.3 Database sources (Chess.com investigation) | ADR 14 · P2-EI-10..22 · P2-EX-01 |
| §6.4 Unified stats, no double counting | P2-EX-10..12 · P2-EI-30..34 |
| §6.5 Opening identification | P2-EX-20..22 |
| §6.6 Explorer architecture | CORE-30..32 · P2-EI-01..14 |
| §7.1 External accounts | P3-IM-01..07 · P1-AC-11 |
| §7.2 Game import | P3-IM-10..16, P3-IM-30..33 |
| §7.3 Synchronization | P3-IM-15, P3-IM-17 |
| §7.4 Library | P3-GL-01..21 |
| §7.5 OpeningTree functionality | P3-OT-01..23 · ADR 15 |
| §7.6 Unified player stats, user perspective | P3-OT-11, P3-OT-14, P3-OT-21 · P3-IM-20 |
| §7.7 Opening performance | P3-OT-30..34 |
| §7.8 Integration with Phase 2 | P3-OT-20, P3-OT-40..42 |
| §7.9 Persistent data | ADR 11 · P3-IM data model |
| §8 Phase 4 preparation | core-architecture "Phase 4 readiness checklist" · ADR 03 |
| §9 Technical architecture | ADRs 05, 06, 16 |
| §10 Standards (testing, async jobs, security) | CORE-50..61 · each spec's acceptance criteria |
| §11 Licensing | ADRs 04, 17 · reuse register + release compliance checklist |
| Follow-up §1 Core vs proprietary AI | ADR 03 · CORE-04, CORE-42 |
| Follow-up §4-5 Browser engine, AnalysisProvider | ADR 09 · CORE-20..23 · P1-AN-10..18 |
| Follow-up §7 + raw-data note | ADR 11 · P1-PZ-40..42 · P1-AN-30..33 · P3-IM-14 |
| Chess.com personal import (decided 2026-10-10) | ADR 18 · P3-IM-02, P3-IM-08, P3-IM-18, P3-IM-19 |
| Masters sourcing, Lichess-style (decided 2026-10-10) | ADR 19 · P2-EI-20..36 |
| Brand (decided 2026-10-10) | P1-UI-14 + Brand section of the UI shell spec |
| Studies at Lichess parity minus chat (decided 2026-10-11) | 2026-10-11-04 · studies spec (M1.4 rewrite) · P1-AC-01 usernames |
| Saved game reviews (decided 2026-10-11) | 2026-10-11-05 · P1-AN-43 |
| Self-hosted tablebase (decided 2026-10-11) | 2026-10-11-06 · P1-AN-50..52 |

## Risks and open items

| Item | Impact | Owner / status |
|---|---|---|
| TWIC and PGN Mentor permission replies (historical masters before ~2020) | thinner Masters tab until granted | user: send the drafts in 2026-10-10-masters-data-permission-requests.plan.md |
| Lichess dump subset size vs VPS disk | explorer coverage | M2.1 sizing review |
| Chess.com objects to persisted personal imports | Chess.com sync off (kill switch); PGN upload fallback | accepted risk, ADR 18 |
| Lichess may restrict anonymous tablebase/export further | already designed around (OAuth import; tablebase self-hosted, 2026-10-11-06) | — |
| Syzygy table files' license not yet verified | tablebase ships disabled until the register row says cleared | M1.2 |
| Paid legal review | only at ADR 17 triggers (money, investment, Phase 4 launch, complaint, trademark) | user, when a trigger fires |
| First deploy has no domain or email service (soft launch, under 5 users) | HTTPS is still required: multi-threaded Stockfish needs a secure context, and auth cookies are `Secure`. A free `<server-ip>.sslip.io` hostname plus Caddy's automatic TLS works with no signup. Email links go to the server log | user, at first deploy; email and verification flip at the 2026-10-11-03-soft-launch-without-email-service trigger |

Resolved 2026-10-10: legal posture (ADR 17), Chess.com import (ADR 18),
masters sourcing (ADR 19), brand (UI shell spec, Brand section).

Resolved 2026-10-11 (Phase 1 readiness review): lint toolchain
(2026-10-11-01), analysis session storage (2026-10-11-02), soft launch without
an email service, with verification optional and export deferred
(2026-10-11-03), and the milestone moves above.

Resolved 2026-10-11 (scope walkthrough with the user): every Phase 1 SHOULD
and COULD was decided one by one (table in
2026-10-11-phase-1-implementation.plan.md). Studies were expanded to Lichess
parity minus chat (2026-10-11-04). Game reviews are saved per user
(2026-10-11-05). The tablebase is self-hosted (2026-10-11-06).

## Phase 4 (not started)

Phase 4 begins with its own spec set (AI service architecture, engine
cluster, Core API auth for services) in a separate private repo. Its ADRs
reference 2026-10-10-03-separate-open-source-core-from-proprietary-ai-service.
