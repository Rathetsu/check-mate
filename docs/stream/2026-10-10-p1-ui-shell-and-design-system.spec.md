# Spec: UI shell and design system

Date: 2026-10-10
Status: Approved (design; no code yet)
Phase: 1 · Milestones M1.0 (shell) and M1.6 (polish)

## Goal

A modern, minimal, consistent app shell where the chessboard is always the
visual focus. It works on desktop, tablet and phone, in light and dark
themes. Lichess is the functional reference, not the visual one.

Decisions: 2026-10-10-04-license-core-agpl-3-or-later (asset allowlist,
Source link) · 2026-10-10-05-typescript-monorepo-nextjs-and-node-worker ·
2026-10-10-08-single-chessground-board-component.

## Route map

| Route | Page | Phase |
|---|---|---|
| `/` | Home: quick links (Analyze, Puzzles, Studies; Explorer from P2, My Games from P3), resume last activity. Links to unshipped phases are hidden, so there are no dead ends | 1 |
| `/analysis`, `/analysis/[...fen]` | Analysis board | 1 |
| `/editor`, `/editor/[...fen]` | Board editor | 1 |
| `/studies`, `/studies/[id]`, `/studies/[id]/[chapterId]` | Studies. `/studies` has tabs: mine / member of / liked / public browse | 1 |
| `/studies/topic/[topic]` | Public studies by topic | 1 |
| `/embed/study/[id]/[chapterId]` | Read-only embeddable chapter: no engine, no COOP/COEP, frameable | 1 |
| `/puzzles`, `/puzzles/[theme]`, `/puzzles/history` | Puzzle training | 1 |
| `/explorer` | Opening explorer (board + explorer panel) | 2 |
| `/games`, `/games/[id]`, `/games/import` | Personal library | 3 |
| `/openings` | Personal opening performance | 3 |
| `/settings/*`, `/auth/*`, `/about`, `/about/data`, `/privacy`, `/source` | Account, auth, attributions, dataset downloads, privacy, source link | 1 (`/about/data` filled in P2) |

## Layout

- **Board page template** (analysis, studies, puzzles, explorer, game view):
  - Board column: board, eval bar, controls.
  - Side panel with tabs: Moves · Engine · Explorer · Info/Comments.
- **Breakpoints:**
  - Desktop ≥1024px: nav rail + board + side panel.
  - Tablet 640-1023px: board on top, panel below, sticky controls.
  - Phone <640px: full-width board, bottom tab bar for navigation, and a
    collapsible panel as a bottom sheet.
- **Board size:** fills the available space up to `min(viewport height − chrome, column width)`. Users can drag to resize on desktop, and the size is stored in preferences.

## Requirements

- **P1-UI-01 MUST** shadcn/ui components on Tailwind CSS 4. Design tokens
  (color, radius, spacing, typography) are OKLCH CSS variables defined in one
  theme file. No ad hoc colors in components.
- **P1-UI-02 MUST** Light, dark and system themes via `next-themes`. No
  flash of the wrong theme on load. Board themes are independent of the app
  theme.
- **P1-UI-03 MUST** Responsive at the three breakpoints above with no
  horizontal scroll. Touch targets ≥ 44px on touch devices.
- **P1-UI-04 MUST** Global keyboard shortcuts, at parity with Lichess where
  applicable:
  - `←` / `→`: previous / next move
  - `Home` / `End`: first / last move
  - `↑` / `↓`: previous / next variation
  - `f`: flip the board
  - `x`: toggle the engine
  - `?`: shortcut help
  - `/`: command palette (SHOULD; 2026-10-11: build in Phase 1). Jump to a
    route, flip, toggle the engine, import PGN.
- **P1-UI-05 MUST** Accessibility:
  - visible focus rings
  - ARIA labels on all controls
  - WCAG AA contrast in both themes
  - `prefers-reduced-motion` disables piece animation
  - the move list is screen-reader navigable
- **P1-UI-06 MUST** Only allowlisted assets ship:
  - **Pieces:** cburnett (default), merida, mono, mpchess,
    fantasy, spatial, celtic, chessnut, rhosgfx, kiwen-suwi, firi.
  - **Boards:** CSS two-color themes we define, plus lila board images
    (AGPL).
  - **Sounds:** Enigmahack sets (futuristic, nes, piano, sfx), or our own,
    or off.
  - Each set is listed in `docs/wiki/open-source-reuse.md` before it is
    added.
- **P1-UI-07 MUST** Banned assets: every CC BY-NC set (california, maestro,
  fresca, cardinal, ...), alpha, the freeware sets (chess7, companion,
  leipzig), shahi-ivory-brown, unlicensed sets, the lichess logo and favicon,
  and lila's unlisted default sounds and art.
- **P1-UI-08 MUST** The footer on every page shows a "Source" link to the
  exact deployed commit (AGPL §13) and an "About & attributions" link. The
  `/about` page lists dataset and asset attributions (CC BY 4.0 pieces, CC
  BY-SA broadcasts).
- **P1-UI-09 MUST** A consistent empty / loading / error state component.
  Errors show the API `error.message`, never a raw stack.
- **P1-UI-10 SHOULD** *(2026-10-11: build.)* Typography: Geist (variable sans, OFL; the
  `create-next-app` default) plus tabular numerals for evals and stats.
  Icons from Lucide (ISC).
- **P1-UI-11 SHOULD** *(2026-10-11: build.)* Toasts via `sonner` (the shadcn default; `toast` is
  deprecated).
- **P1-UI-12 MUST** COOP/COEP headers only on engine routes (`/analysis`,
  `/studies/*`, `/games/[id]`, `/explorer`), per
  2026-10-10-09-browser-stockfish-behind-analysis-provider. Those pages
  embed no third-party resources that lack CORP.
  - Cross-origin isolation is fixed when a document loads, so links into
    and out of engine routes use full-page navigation (a plain `<a>`, not
    Next `<Link>`). Otherwise the engine runs single-threaded after a soft
    navigation, and pages left by soft navigation keep the strict COEP
    document.
- **P1-UI-13 MUST** A `/privacy` page in plain language covering:
  - what is stored (account, preferences, studies, puzzle attempts, analysis
    sessions, imported games, linked accounts)
  - why it's stored
  - that nothing is sold or shared
  - how to delete (P1-AC-10), and that export (P1-AC-12) is coming
    (2026-10-11-03-soft-launch-without-email-service)
  - that new passwords are checked against known breaches by sending a
    5-character hash prefix to Have I Been Pwned (P1-AC-01)
  - a contact address
  - Linked from the footer and the sign-up form
    (2026-10-10-17-self-administered-license-compliance).
- **P1-UI-14 MUST** Brand tokens and the reserved-color rule exactly as in
  "Brand" below. A lint or test check fails if a move-quality, arrow or W/D/L
  component uses `--primary`.

## Brand

- **Name:** **CheckMate**. The wordplay: *mate* as in friend, a chess
  companion. Suggested tagline: "Your chess mate."
- **Voice:** friendly, plain and encouraging. Never condescending, never
  hype. Explain chess terms the first time they appear.
- **Wordmark:** "Check" in the foreground color and "Mate" in the primary
  color, set in the UI font at semibold. This is text only until a logo is
  designed. The favicon is a rounded square in primary with a white "CM"
  monogram.
- **Primary ("Mate Violet"):** OKLCH is the source of truth; hex values are
  for reference. Contrast was computed 2026-10-10.

| Token | Light | Dark |
|---|---|---|
| `--primary` | `oklch(0.53 0.21 285)` ≈ `#664CDD` | `oklch(0.74 0.14 285)` ≈ `#A29DFF` |
| `--primary-foreground` | `oklch(0.99 0 0)` (white). Contrast 5.76:1 | `oklch(0.20 0.02 285)` ≈ `#15151F`. Contrast 7.5:1 |
| `--background` | `oklch(0.99 0.003 285)` ≈ `#FBFBFE`. Primary-as-text contrast 5.60:1 | `oklch(0.17 0.012 285)` ≈ `#0F0F15`. Primary-as-text contrast ≈7.9:1 |
| `--ring` | = `--primary` | = `--primary` |
| neutrals | hue 285, chroma ≤ 0.012 (subtly cool grays) | same |

- **Where primary is used:**
  - primary buttons and links
  - focus rings
  - the selected nav item
  - the current move in the move list
  - toggles and sliders
  - the wordmark's "Mate"
- **Reserved colors, never primary.** These keep chess conventions:
  - **Move quality:** brilliant (cyan), best/good (green), inaccuracy
    (yellow), mistake (orange), blunder (red).
  - **Annotation arrows:** green/red/yellow/blue (Lichess convention, PGN
    `%cal` letters G/R/Y/B).
  - **Bars:** the eval bar and W/D/L bars use white/gray/black.
  - **Board:** squares, last-move and check highlights all come from the
    board theme.
  - Violet was chosen because none of these use it.

## Reuse

| Component | Mode |
|---|---|
| shadcn/ui, Tailwind, Lucide, next-themes, Geist | reused |
| Lichess layout and shortcuts | functional reference only |
| Lichess piece and board assets | reused per allowlist |

## Chess-authority notes

None directly. Eval bars and labels render provider output only.

## Phase 4 hooks

The side panel's tab system lets a future "Coach" tab mount without layout
changes. The tab content will come from the AI API.

## Acceptance criteria

- Playwright visual pass of each route at 375px, 768px and 1440px in light
  and dark themes: no horizontal scroll, board visible above the fold.
- axe-core run on each route: zero serious or critical violations.
- A build-time check fails if a piece or sound directory isn't in the
  allowlist file.
- Footer "Source" link resolves to the deployed commit hash.

## Open questions

- Logo: text wordmark until a designer pass. Not blocking.
- Trademark search for "CheckMate" before monetizing (ADR 17 trigger).

## Build notes

### M1.2 (2026-10-11)

- **P1-UI-04:** `/` opens the command palette (cmdk via shadcn
  `command`) from any page: routes, plus actions the current page registers
  (`useRegisterCommands`), such as flip, start/stop the engine, engine
  settings and import. `?` opens the shortcut list. Both ignore keys typed
  into fields and dialogs.
- **P1-UI-12:** isolation is on `/analysis` and `/studies`. Workers started
  by an isolated page load only when their own script also sends COEP, so
  `/engine/*` (Stockfish) and `/_next/static/*` (the PGN indexer's chunk)
  send COEP + CORP `same-origin`. `NavLink` renders a plain `<a>` when a
  link crosses the boundary.


### UI refresh (2026-10-11)

- Brand (Mate Green, eggshell light theme), the `/` home page and the
  collapsible desktop rail are superseded by
  2026-10-11-ui-refresh.spec.md and ADR 2026-10-11-08. The logo brief
  there closes the "Logo" open question.
