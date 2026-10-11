# Spec: UI refresh (brand, shell, home)

Date: 2026-10-11
Status: Built (2026-10-11)
Supersedes, in 2026-10-10-p1-ui-shell-and-design-system.spec.md: the Brand
section, the `/` row of the route map, and the desktop rail in Layout.
Everything else there still holds.

Decisions: 2026-10-11-08-mate-green-brand-accent.

## Goal

The owner reviewed the shipped UI and asked for four things:
- the green accent they chose, instead of violet;
- a softer light theme;
- a sidebar that can be collapsed;
- a home page that sells the AI coach.

A logo is being designed separately (see Logo brief).

## Brand

- **Name and wordmark:** unchanged. "Check" in the foreground color and
  "Mate" in primary, semibold, text only until the logo arrives.
- **Voice:** in-app copy stays friendly, plain and encouraging. The home
  hero may be bold about the AI coach. Never mention "free" or "open
  source" there (the footer Source link stays for AGPL §13).
- **Tokens** (OKLCH is the source of truth, all in
  `apps/web/src/app/globals.css`):

| Token | Light | Dark |
|---|---|---|
| `--primary` "Mate Green" | `oklch(0.47 0.095 162)` ≈ `#156B4A` | `oklch(0.76 0.12 160)` ≈ `#64C897` |
| `--primary-foreground` | `oklch(0.99 0 0)` | `oklch(0.2 0.02 160)` |
| `--sidebar` | `oklch(0.945 0.009 85)` | `oklch(0.2 0.008 160)` |
| `--background` | `oklch(0.965 0.008 85)` ≈ `#F6F3ED` (eggshell) | `oklch(0.18 0.008 160)` |
| `--card` | `oklch(0.982 0.005 85)` | `oklch(0.215 0.009 160)` |
| `--popover` | white | = card |
| `--field` | white | transparent (fields use `dark:bg-input/30`) |
| neutrals | hue 85, chroma ≤ 0.012 | hue 160, chroma ≤ 0.01 |

- **White by elevation (light):** sidebar < background < card < white.
  Pure white is only for floating surfaces (menus, dialogs, select lists,
  toasts, the palette) and for fields you type into.
- **Contrast** (computed 2026-10-11):
  - white on primary: 6.5:1
  - primary text on the background: 5.9:1, and on the sidebar 5.5:1
  - the selected nav item (primary on `primary/10`): 5.1:1
  - muted text on the background: 5.9:1
  - inactive tabs use `text-muted-foreground`: 5.4:1 on `--muted`
- **Where primary is used:** as before (buttons, links, focus rings, the
  selected nav item as `bg-primary/10 text-primary`, the current move,
  toggles, the wordmark's "Mate").
- **Reserved colors:** unchanged and never primary: move quality, arrows,
  eval and W/D/L bars, board squares and highlights. The overlap of green
  with "good move" and the green arrow is accepted in ADR 2026-10-11-08.

## Desktop rail

- At ≥1024px a toggle ("Collapse navigation" / "Expand navigation", above
  the account button) switches the 224px labelled rail to the 64px icon
  rail. Labels stay for screen readers, and a `title` tooltip shows them.
- **Persistence:** the choice lives in the `checkmate-rail` cookie
  (`collapsed` / `open`, one year, `SameSite=Lax`). The root layout reads
  it, so full page loads across the engine-route boundary (P1-UI-12) render
  the right width with no flash. It's listed on `/privacy`.
- **No width animation:** it would redraw the chessboard on every frame.
- **Unchanged:** tablet (icon rail, no toggle) and phone (top bar and
  bottom tab bar). The signed-out "Sign in" button shows an icon, with its
  label visually hidden on the icon rail.

## Home (`/`)

### Hero: "Exploded board"

The copy column holds:
- the wordmark
- an "AI chess coach" chip
- the h1: "Every move has layers. Your coach sees all of them."
- one paragraph
- the CTAs: **Start analyzing** (primary), "Continue your last analysis"
  (when a session exists), and "Create an account" / "Sign in" (signed
  out)

The board column is a CSS-3D board split into three planes:
1. **squares**, from the visitor's board theme
2. **attack shading**, white or black per square by net direct attackers,
   from `squareControl()` in `packages/chess`
3. **pieces**, in the visitor's piece set

Labels ("Board", "Control", "Pieces") sit beside the board, and a caption
names the position.

- **Position:** the hero shows a verbatim entry from the openings table,
  C50 Italian Game: Giuoco Pianissimo. The name comes from the table at
  request time, so if the entry goes, the caption goes too.
- **Scroll motion:** at ≥1024px, with scroll timelines and motion allowed,
  the 200vh section pins a 100svh stage. Scrolling turns the board and
  parts its layers, which rejoin facing the viewer as the cards arrive.
  - It's pure CSS: one `view-timeline` with `animation-range: contain`.
  - Only `transform` and `opacity` animate, with literal keyframes, so it
    all runs on the compositor (verified with a trace on 2026-10-11).
  - No `@property` and no `var()` inside keyframes.
- **Fallback:** everywhere else the board shows a still, slightly exploded
  pose: Firefox stable (scroll timelines still behind a flag), older
  Safari, phones, tablets and reduced motion.
- **Pointer tilt:** ±6°, the only JS. It writes `transform` on one element
  and runs only for fine pointers with motion allowed.
- **Cards:** below the hero, generated from `NAV` entries that have a
  `blurb`, so only shipped routes get one. They fade up on entry inside the
  same gate.

### Hero alternatives (for later)

- **Paper diorama:** a layered paper-cut stage of piece silhouettes in
  graduated greens on eggshell. Scrolling dollies into the stage: far
  layers drift, near layers part to reveal the cards. It's warm and suits
  a mascot standing center stage.
- **Fly over the board:** a huge board in perspective. Scrolling glides the
  camera low across it toward the horizon, with tall pieces passing at
  different depths. It's the most cinematic option, but the heaviest on
  low-end phones.

## Logo brief

A pawn mascot that is clearly not Chess.com's (a faceless flat green pawn).
It must later work as a talking character. The owner generates it and
delivers SVGs (full body, head only, favicon). The wordmark and favicon
switch over when they arrive.

**Main prompt:**

> A friendly mascot logo of a chess pawn character. The pawn keeps the
> classic pawn silhouette (round head, collar ring, flared base) but with
> chunky, cute proportions; the head is about 40% of its height. Its body
> is warm cream ivory (#F6F3ED) with flat soft shading. It has a gentle,
> confident face: two simple dark eyes behind round, thick-rimmed glasses
> in dark ink (#191610), small expressive eyebrows, a small warm
> closed-mouth smile and faint rosy cheeks. It wears a cozy knit scarf in
> deep emerald green (#156B4A), wrapped once around the collar with one end
> hanging down; the end has a tiny two-tone checkered pattern. Flat vector
> illustration, bold simple shapes, one consistent medium-weight dark
> outline, no more than four colors, no gradients or textures. Front-facing
> and standing with a slight head tilt, looking at the viewer like a
> familiar friend. Centered on a plain off-white background with generous
> padding. Logo-ready and readable at small sizes.

**Avoid:**

> text, letters, chessboard, other chess pieces, crown, lime or neon green,
> flat faceless silhouette, 3D render, photorealism, gradients, drop
> shadows, busy background

**Variations, a favicon prompt and a mascot sheet:**
- **Outfit swaps:** a sweater vest, a hoodie, or a cardigan with a bow tie.
- **Favicon:** the head and glasses only, in an emerald rounded square.
- **Mascot sheet (later):** front, three-quarter and side views, plus
  expressions (happy, thinking, surprised, proud, encouraging, talking).
- **For animation:** keep the mouth simple. Arms come later, if at all.

## Checks

- Unit: `squareControl` in `packages/chess/test/rules.test.ts`.
- e2e: the existing suite. The home page keeps "Continue your last
  analysis", and the rail keeps the "Sign in" and "Account menu" names.
- Manual, 2026-10-11:
  - no horizontal scroll at 375, 768 and 1440 in both themes;
  - axe found no serious or critical issues on `/`, `/analysis`,
    `/auth/sign-in` and `/privacy`;
  - the collapsed rail survives a reload and a full load into `/analysis`.
