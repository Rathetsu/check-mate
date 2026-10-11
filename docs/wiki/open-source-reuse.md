---
kind: system
---

# Open-source reuse, licenses and data sources

The register of every third-party component, dataset, external API and asset
CheckMate uses or has considered. **A thing gets a row here before it is
merged** (2026-10-10-04-license-core-agpl-3-or-later). A dataset may be
ingested only when its row says **cleared**
(2026-10-10-14-self-hosted-opening-explorer-from-licensed-data).

Last verified: 2026-10-11. Platform licenses come from the installed
packages (`pnpm -r licenses list`). Other rows were checked against upstream
LICENSE/COPYING files, the npm registry, or official terms.

**Machine-read.** `scripts/check-register.ts` reads this page in CI. A direct
dependency counts as registered when its exact npm name appears in backticks
in the Component or Version cell of a row whose Mode starts with "reused" or
"adapted". `@types/*`-style patterns are allowed. The same script generates
`NOTICE` and the `/about` page from these tables.

CheckMate Core license: **AGPL-3.0-or-later**. This is not legal advice.
Compliance is self-administered through the checklist at the end of this
page. A paid review happens only at the triggers in
2026-10-10-17-self-administered-license-compliance.

## Mode legend

- **reused**: used as a dependency or service, unmodified
- **adapted**: code or logic ported into CheckMate with attribution headers
- **reference**: studied for behavior or UX; no code copied
- **not used**: evaluated and rejected (reason given)

## Chess code

| Component | Upstream | Version | License | Mode | Where | Obligations / notes |
|---|---|---|---|---|---|---|
| lila (Lichess) | github.com/lichess-org/lila | assets: `46d24871` (2026-10-11, `scripts/fetch-lila-assets.sh`); ports: commit cited in each file | AGPL-3.0-or-later | adapted: editor castling/ep logic, puzzle `moveTest.ts`, Advice win-chance constants, puzzle theme keys/groups · reference: `ui/analyse`, `ui/ceval`, explorer panel | P1-P2 | Attribution header with upstream path and commit in every adapted file; Core stays AGPL; Source link |
| chessground | github.com/lichess-org/chessground | `@lichess-org/chessground` 10.4.2 | GPL-3.0-or-later | reused | `<Board>` | README: source must be released to site users. Satisfied by the AGPL Source link |
| chessops (`chessops`) | github.com/niklasf/chessops | 0.15.1 | GPL-3.0-or-later | reused | `packages/chess` | Same as above. No Zobrist module (we use EPD keys) |
| lila-openingexplorer | github.com/lichess-org/lila-openingexplorer | 3.0.0 | AGPL-3.0-or-later | reused, unmodified, separate service · `import-master.py` rules mirrored (avg Elo ≥ 2200, terminal-position + year dedup) | P2 explorer | Link upstream source on `/about`; publish the fork if ever patched |
| stockfish.js (`stockfish`) | github.com/nmrugg/stockfish.js | 19.0.1 (Stockfish 19) | GPL-3.0 (engine); MIT (non-engine code) | reused | browser `AnalysisProvider` | Ship/offer corresponding source for the WASM build we serve |
| OpeningTree | github.com/openingtree/openingtree | master | GPL-3.0 | reference (UX, filters, perspective) | P3 | No code copied. It is React 16 class components and computes in the browser only |
| pgn-viewer | github.com/lichess-org/pgn-viewer | 2.7.3 | GPL-3.0-or-later | not used | — | snabbdom-based; our analysis board covers viewing |
| stockfish-web | github.com/lichess-org/stockfish-web | 0.5.0 | LICENSE says GPL-3.0; package.json says AGPL-3.0-or-later | not used | — | Lichess-specific; its README points third parties to stockfish.js |
| chess.js | github.com/jhlywa/chess.js | 1.4.0 | BSD-2-Clause | not used | — | `loadPgn` discards side variations (ADR 07) |
| @react-chess/chessground | npm | 1.3.4 | — | not used | — | Pins chessground 8.3.5 and React ≤18 |

## Platform and tooling

| Component | Version (2026-10-11) | License | Mode | Notes |
|---|---|---|---|---|
| Next.js (`next`) | 16.4.0 | MIT | reused | `proxy.ts` replaces `middleware.ts` |
| React (`react`, `react-dom`) | 19.3.0 | MIT | reused | |
| Tailwind CSS (`tailwindcss`, `@tailwindcss/postcss`) | 4.3.3 | MIT | reused | |
| shadcn/ui (`shadcn`) | 4.21.4 | MIT | reused (components vendored in `apps/web/src/components/ui`, style `radix-nova`) | Dev only: the CLI, plus its `tailwind.css` |
| shadcn runtime deps (`radix-ui`, `class-variance-authority`, `cn`, `tw-animate-css`) | 1.7.0 / 0.7.1 / 0.4.0 / 1.4.0 | MIT / Apache-2.0 / MIT / MIT | reused | `cn` is shadcn's own replacement for clsx + tailwind-merge |
| Lucide icons (`lucide-react`) | 1.55.0 | ISC | reused | |
| sonner (`sonner`) | 2.0.8 | MIT | reused | Toasts (P1-UI-11) |
| next-themes (`next-themes`) | 0.4.6 | MIT | reused | Light/dark/system without flash (P1-UI-02) |
| Better Auth (`better-auth`) | 1.7.7 | MIT | reused | Vercel-owned since 2026-07-07. `username` and `haveIBeenPwned` plugins enabled (P1-AC-01) |
| nodemailer (`nodemailer`) | 10.1.0 | MIT-0 | reused | SMTP for `sendEmail`. Without SMTP env, links go to the server log (2026-10-11-03) |
| ESLint (`eslint`, `typescript-eslint`, `eslint-config-next`) | 10.12.0 / 8.71.1 / 16.4.0 | MIT | reused (dev only) | Boundary rules via `no-restricted-imports` (2026-10-11-01) |
| Prettier (`prettier`) | 3.9.10 | MIT | reused (dev only) | |
| TypeScript (`typescript`) | 6.0.3 | Apache-2.0 | reused (dev only) | 7.x waits for typescript-eslint (peer range `<6.1`) |
| DefinitelyTyped (`@types/*`) | — | MIT | reused (dev only) | Type definitions |
| Drizzle ORM / drizzle-kit (`drizzle-orm`, `drizzle-kit`) | 0.45.4 / 0.31.11 | Apache-2.0 / MIT | reused | 1.0 is an RC; migration-folder change pending |
| node-postgres (`pg`) | 8.23.1 | MIT | reused | Postgres driver for Drizzle; pg-boss uses it too |
| pg-boss (`pg-boss`) | 12.37.1 | MIT | reused | Node 22.12+, Postgres 13+ |
| pnpm / Turborepo (`turbo`) | 12.11.2 / 2.11.7 | MIT | reused | pnpm via corepack (`packageManager`) |
| Vitest / Playwright (`vitest`, `@playwright/test`) | 5.0.3 / 1.64.0 | MIT / Apache-2.0 | reused (dev only) | |
| zod (`zod`) | 4.6.5 | MIT | reused | `/api/v1` input/output schemas |
| axe-core (`@axe-core/playwright`) | 4.13.0 | MPL-2.0 | reused (tests only) | a11y checks (M1.6) |
| testcontainers | — | MIT | not used | The compose `postgres` service runs service tests locally and in CI |
| Geist font | latest | OFL-1.1 | reused | UI font (P1-UI-10), self-hosted at build by `next/font` |
| Inter font | — | OFL-1.1 | not used | Geist chosen 2026-10-11 |
| PostgreSQL (+ `pg_trgm`) | 18.6 | PostgreSQL License | reused | Compose image `postgres:18.6-alpine` |
| Caddy | 2.11.7 | Apache-2.0 | reused | |
| Mailpit | 1.31.5 | MIT | reused (dev only) | |

## Datasets and external APIs

| Source | Terms | Status | Used for | Obligations / limits |
|---|---|---|---|---|
| Lichess standard rated game dumps (database.lichess.org) | CC0 | **cleared** | explorer `lichess` index | 8.22B games. We ingest a sized subset |
| Lichess puzzle CSV | CC0 | **cleared** | puzzles | 6,157,341 puzzles (2026-10-05). Attribution optional; given anyway |
| Lichess broadcast dumps | CC BY-SA 4.0 | **cleared, with obligations** | explorer `masters` index | Attribution in UI. Share-alike is met by the monthly CC BY-SA masters dump on `/about/data` (P2-EI-35) |
| lichess-org/chess-openings | CC0 | **cleared** | opening classifier | Vendored at a pinned commit |
| Lichess Masters database | no license; not downloadable | **excluded** (data) | — | ~3M OTB games, curated privately by Lichess (Rotella base, 2016; manual batch updates). We copy the *method*, not the data (2026-10-10-19-curated-masters-set-deduped-by-terminal-position) |
| Lichess explorer API (explorer.lichess.org) | Lichess ToS; OAuth required since 2026-03-03; 20 req/min per user | optional (COULD) | `lichess-account` source, user's own token only | Never with a shared server token; cache responses |
| Lichess game export + OAuth API | Lichess ToS; one request at a time; wait ≥60 s after 429 | **cleared** | P3 imports | PKCE public client, no scopes; anonymous export is being throttled |
| Have I Been Pwned (Pwned Passwords range API) | free, no key; k-anonymity (only a 5-character SHA-1 prefix is sent) | **cleared** | password breach check at sign-up and password change (P1-AC-01) | Disclosed on `/privacy` |
| Test fixtures (`packages/chess/fixtures/`) | per file: Lichess game exports CC0, broadcast round CC BY-SA 4.0, our own study and Chess.com games, synthetic malformed files | **cleared** | PGN/FEN tests | Sources and licenses listed in the fixture README. No other players' Chess.com data |
| Chess.com PubAPI | User Agreement §2(C), §2(D), §4(D) | **accepted risk**: personal import only (2026-10-10-18-import-own-chesscom-games-accepted-risk) | P3 imports, owner-private | Linked usernames only (max 3 per user); serial requests; User-Agent with contact; ETag caching; kill switch `CHESSCOM_IMPORT_ENABLED`. **Never** in shared stats or datasets |
| TWIC | "free for personal use only… for your online project, please get in touch" | **pending permission** (draft not yet sent) | `masters` once cleared | Contact mdcrowth@btinternet.com. Tracking: 2026-10-10-masters-data-permission-requests.plan.md |
| Lumbra's GigaBase | CC BY-NC 4.0 (from Oct 2026) | **excluded** | — | Non-commercial |
| PGN Mentor | "completely free", no license text found | **pending permission** (draft not yet sent) | `masters` once cleared | Same tracking plan |
| Caissabase | unverified (site returned 403) | **blocked** | — | Compiled from TWIC, KingBase and others |
| KingBase | discontinued; unverified | **blocked** | — | |

## Assets (from lila COPYING.md)

| Status | Assets | License |
|---|---|---|
| **Allowed** | pieces cburnett, merida, mono | GPLv2+ |
| **Allowed** | pieces mpchess | GPLv3+ |
| **Allowed** | pieces letter, pixel, pirouetti, CubesAndPi; lila board images | AGPLv3+ |
| **Allowed** | pieces fantasy, spatial, celtic | MIT |
| **Allowed** | pieces chessnut | Apache-2.0 |
| **Allowed** | pieces rhosgfx | CC0 |
| **Allowed, with attribution** | pieces kiwen-suwi, firi | CC BY 4.0 |
| **Allowed, with attribution and share-alike** | pieces shapes | CC BY-SA 4.0 |
| **Allowed, with attribution** | game-icons.net theme icons | CC BY 3.0 |
| **Allowed** | sounds futuristic, nes, piano, sfx (Enigmahack) | AGPLv3+ |
| **Allowed** | fonts Noto Sans, Roboto | Apache-2.0 |
| **Banned** (non-commercial) | california, maestro, fresca, cardinal, dubrovny, icpieces, tatiana, gioco, horsey, anarcandy, disguised, cooke, monarchy, xkcd; lisp sounds | CC BY-NC-SA |
| **Not a 2D set** | staunton (James Clarke, MIT): lila's `public/images/staunton` holds 3D-board sprites only. The similar 2D set `staunty` is CC BY-NC-SA (banned) | — |
| **Banned** (restricted or unclear) | alpha (personal non-commercial); chess7, companion, leipzig (freeware); shahi-ivory-brown (no derivatives); totoy, papercut (listed under non-free); Staunton 3D, reillycraig, riohacha (no license) | — |
| **Banned** | lichess logo and favicon; "other sounds" (lila default set) and "other artwork" | no license |

## Attribution surfaces

- **`/about`:**
  - every row above marked reused or adapted, plus allowed assets that need
    attribution
  - dataset credits: Lichess CC0 databases, Lichess broadcasts (CC BY-SA
    4.0)
  - a link to upstream lila-openingexplorer source
- **Explorer panel:** the source attribution string plus a "Download dataset"
  link (P2-EX-02).
- **`/about/data`:** the monthly CC BY-SA 4.0 masters dump, with
  `SOURCES.md` and the license (P2-EI-35).
- **Footer:** the Source link to the deployed commit (P1-UI-08).

## Release compliance checklist

Release gate per 2026-10-10-17-self-administered-license-compliance. Every
public deploy must pass all items. CI checks the ones marked (auto).

1. The repo is public. `LICENSE` is AGPL-3.0-or-later. The footer Source
   link resolves to the deployed commit (auto: smoke test).
2. Every dependency, asset and dataset in the build has a row here (auto).
   - A script reads this page's tables and fails if a **direct** dependency
     in any `package.json`, or an asset directory, has no row. The same
     parsed tables generate `NOTICE` and `/about`, so this page stays the
     single source.
   - **Transitive** dependencies get no rows. `pnpm -r licenses list --json`
     fails CI on any license outside the allowlist:
     `MIT` `MIT-0` `ISC` `BSD-2-Clause` `BSD-3-Clause` `0BSD` `Apache-2.0`
     `MPL-2.0` `BlueOak-1.0.0` `Python-2.0` `Unlicense` `CC0-1.0`
     `CC-BY-4.0` `OFL-1.1` `GPL-3.0` `GPL-3.0-or-later` `AGPL-3.0`
     `AGPL-3.0-or-later` `LGPL-3.0-or-later`
     - CC-BY-4.0: e.g. caniuse-lite, credited on `/about`.
     - LGPL-3.0-or-later (added 2026-10-11): sharp's prebuilt libvips
       (`@img/sharp-libvips-*`), pulled in by Next.js image optimization.
       It is dynamically linked and AGPL-compatible.
     - Extending the allowlist is an edit to this page, reviewed like any
       other.
3. Only allowlisted assets ship (auto: build check, P1-UI-06).
4. Only `cleared` OTB sources are ingested (auto: P2-EI-21).
5. `/about` lists every reused or adapted component and every attribution
   (CC BY 4.0 pieces, game-icons.net, Lichess datasets, broadcasts CC BY-SA).
6. The CC BY-SA masters dump for the current index is published on
   `/about/data` (from P2).
7. The shipped Stockfish WASM build links to its exact source (stockfish.js
   release).
8. `/privacy` is current and linked. Account deletion works (auto: e2e).
   Data export is deferred until the
   2026-10-11-03-soft-launch-without-email-service trigger, and then must
   work too.
9. Chess.com import mitigations are in place: cap, linked-only, kill switch
   (auto: P3 tests).
10. No LLM/AI code in the repo (auto: dependency denylist, ADR 03).

Free help for AGPL/GPL questions: licensing@fsf.org (FSF Licensing &
Compliance Lab).
