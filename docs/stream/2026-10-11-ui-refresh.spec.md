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

## Logo brief, revision 1 (2026-10-12)

Supersedes the prompts in "Logo brief". The first generations came out too
cute. The mascot should read as the nerdy friend who has read every chess
book: clever and a little smug, not adorable. So it has no blush, adult
proportions, heavier glasses and a sweater vest instead of a scarf.

**Main prompt:**

> A mascot logo of a chess pawn character with a nerdy, clever personality.
> The pawn keeps the classic, upright pawn silhouette (round head, collar
> ring, flared base) with adult proportions, not chibi; the head is about a
> third of its height. Its body is warm cream ivory (#F6F3ED) with flat
> shading. It wears thick, slightly oversized rectangular horn-rimmed
> glasses in dark ink (#191610), with a small flat glint on one lens. Behind
> them are small, focused eyes, one eyebrow raised in a curious,
> know-it-all look, and a subtle lopsided half-smile, as if it just spotted
> the winning move. It wears a deep emerald (#156B4A) sweater vest with a
> faint checkered pattern over a white collared shirt, with a small dark
> bow tie. Flat vector illustration with clean geometric shapes and one
> consistent medium-weight dark outline. No more than four colors; no
> gradients, textures or blush. Front-facing and standing with a slight
> head tilt. Centered on a plain off-white background with generous
> padding. Logo-ready and readable at small sizes.

**Avoid:**

> rosy cheeks, blush, big sparkly eyes, chibi, kawaii, baby proportions,
> wide grin, text, letters, chessboard, other chess pieces, crown, lime or
> neon green, flat faceless silhouette, 3D render, photorealism, gradients,
> drop shadows, busy background

**Dials, if the result is off:**
- **Still too cute:** "smaller eyes", "narrower, less round head",
  "drier expression".
- **Too goofy:** drop the bow tie and keep just the vest over the shirt
  collar.
- **More nerd:** "a pencil tucked into the collar" or "a pocket with two
  pens on the vest". Taped glasses read as a joke, so leave them out.

**Favicon:** the head and glasses only, simplified for 32px (thick shapes,
the raised eyebrow kept), a cream pawn head in an emerald (#156B4A)
rounded square.

**Mascot sheet (later):** front, three-quarter and side views, plus
expressions: raised-eyebrow skeptical, explaining (mouth open, mid-word),
eureka, smug, concerned, impressed.

## Logo brief, revision 2 (2026-10-12)

Supersedes revision 1. Changes:
- **The scarf is back.** A slim scarf in place of the sweater vest.
- **Every feature is pinned down** (body geometry, face placement, colors,
  line weight) so repeated runs stay close, and so the character can be
  animated later.
- **No head tilt.** A straight front view is the base pose; tilt can come
  in animation.
- **No hair.** The round head is what reads as "pawn", especially at
  favicon size, and hair is one more part that varies between runs.

A prompt can't make ChatGPT deterministic, since it exposes no seed. The
real lock is the chosen image: reuse it as the reference for every later
generation, then vectorize it with eyes, eyebrows, mouth, glasses and scarf
end on separate layers.

**Main prompt:**

> Generate an image of: A mascot logo: a chess pawn character with a nerdy,
> clever personality. Follow this character spec exactly; do not add,
> remove or restyle anything.
>
> CANVAS
> - Square 1:1. Flat solid off-white background (#FAF8F3), nothing else in
>   the background.
> - One character, centered. Front view, straight-on with no perspective,
>   standing upright, head not tilted. It fills about 70% of the canvas
>   height.
>
> STYLE
> - Flat vector illustration with solid color fills only. No gradients,
>   shading, textures, shadows or highlights, except the single lens glint
>   below.
> - Every shape has the same uniform dark ink outline (#191610), about 3%
>   of the head's width thick, with rounded joins.
> - Use exactly these colors: ink #191610, cream #F6F3ED, emerald #156B4A,
>   white #FFFFFF (lens glint only), and the background #FAF8F3.
>
> BODY: a classic Staunton pawn. Units: head width = 1. From top to bottom,
> perfectly symmetric left to right, filled cream:
> 1. Head: a perfect circle, 1 wide.
> 2. Collar ring: a flat horizontal disc seen edge-on (a rounded
>    rectangle), 1.15 wide and 0.18 tall, tucked just under the head.
> 3. Body: a smooth flaring stem, 0.55 wide under the collar and widening to
>    1.25 at its bottom, with gently concave sides; 1.45 tall.
> 4. Base ring: a rounded horizontal band, 1.45 wide and 0.22 tall.
> 5. Plinth: a flat slab, 1.6 wide and 0.2 tall, with a perfectly flat
>    bottom edge.
>
> The total height is 3, so the head is one third. No arms, hands, legs or
> feet.
>
> SCARF
> - A slim emerald scarf (solid fill, no knit texture), 0.22 thick, wrapped
>   once around the top of the body directly below the collar ring. The
>   collar ring stays fully visible above it.
> - One end hangs straight down the front on the viewer's left, ending level
>   with the top of the base ring.
> - The last 0.3 of that end is a checkerboard of emerald and cream squares,
>   2 columns by 3 rows. No fringe.
>
> FACE (on the head)
> - Glasses: two identical rectangular lenses with slightly rounded corners,
>   each 0.34 wide and 0.24 tall, in thick ink frames (0.05 thick), joined
>   by a short straight bridge. The lenses sit on the head's horizontal
>   centerline, centered 0.21 left and right of the middle, with short
>   temple stubs reaching the head outline. The lenses are clear, so the
>   cream head shows through.
> - Glint: one short white diagonal stroke in the upper-left corner of the
>   viewer's left lens.
> - Eyes: two small solid ink dots, perfectly round, 0.07 wide, one centered
>   in each lens. No eye highlights.
> - Eyebrows: two short thick ink strokes with rounded ends, each 0.2 long.
>   The viewer's left brow is flat and level, just above the frame. The
>   viewer's right brow is raised clearly higher and angled upward toward
>   the outside: a curious, know-it-all look.
> - Mouth: one thin ink line forming a lopsided closed half-smile, flat on
>   the left and curling upward at the right end. It is 0.22 long, set
>   slightly right of center, halfway between the glasses and the bottom of
>   the head. No teeth.
> - No nose, ears, hair, cheeks or blush.
>
> EXPRESSION: clever, curious and a little smug, as if it just spotted the
> winning move.

**Avoid:**

> rosy cheeks, blush, big sparkly eyes, eye highlights, chibi, kawaii, baby
> proportions, wide grin, arms, hands, hair, head tilt, perspective, 3D
> render, photorealism, gradients, shading, drop shadows, textures, text,
> letters, chessboard, other chess pieces, crown, lime or neon green, busy
> background

**Follow-ups:** in the same chat, attach the chosen image to each request:

> Use the attached image as the exact character reference. Keep every
> shape, proportion, color, line weight and facial feature identical.
> Change only: [the one thing].

**Favicon:**

> Using the attached character as the exact reference: an app icon of the
> head only (head circle, glasses, glint, eyes, both eyebrows with the
> raised one, mouth), centered on a deep emerald (#156B4A) rounded square.
> Cream head, ink outline about twice as thick as in the full-body version,
> simplified to read at 32px. No scarf, no body, no text.
