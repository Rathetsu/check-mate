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

## Logo brief, revision 3 (2026-10-12)

Supersedes revision 2. Revision 2's numeric geometry and "flat vector,
solid fills, dot eyes" produced a sterile, flat line icon. The owner
prefers the earlier vest-and-bow-tie generation's look:
- a cartoon pawn with volume: curved ring edges, soft cel shading and
  bolder outer lines;
- the head turned slightly, so the glasses wrap around it;
- half-lidded smug eyes;
- tapered brush-stroke eyebrows, one arched and one angled down.

Revision 3 describes that look in visual terms instead of numbers, with the
scarf in place of the vest.

The most reliable way to keep the look is to edit that earlier image rather
than generate from text:

> Edit the attached image. Keep the character exactly as it is: the same
> pawn shape, rendering style, depth and shading, line weight, glasses,
> eyes, eyebrows, smirk, colors and pose. Make only these changes: remove
> the sweater vest, the white shirt collar and the bow tie. Instead, wrap a
> slim deep emerald (#156B4A) knit scarf once around the neck, just below
> the collar ring, with one end hanging down the front on the viewer's
> left. Near its tip, the scarf has the same two-tone green checker pattern
> the vest had. The body below the scarf is plain cream like the rest of
> the pawn. Keep the plain off-white background.

**Standalone prompt** (from scratch, and as the written character spec):

> Generate an image of: A mascot logo of a chess pawn character with a
> nerdy, clever personality, drawn as a polished cartoon illustration with
> real volume: it reads as a rounded, three-dimensional turned-wood chess
> piece, not a flat icon.
>
> STYLE
> - Bold black ink outlines, slightly thicker on the outer silhouette and
>   thinner on inner details, like a hand-inked mascot logo.
> - Soft two-tone cel shading: one darker tone per color on the lower-right
>   side of each form, light coming from the upper left, plus small clean
>   highlights.
> - No airbrushed gradients, no textures, no drop shadow on the ground.
> - Colors: cream ivory body (#F6F3ED) shaded with warm darker cream
>   (#E4DCCB); ink (#191610); deep emerald (#156B4A) with a lighter emerald
>   (#2E8B63) for the checker and highlights; white only for the lens glint
>   and the eye catchlights. Plain off-white background (#FAF8F3).
>
> BODY: a classic Staunton pawn, seen from slightly above eye level, so
> every ring shows a gentle elliptical curve.
> - A smooth spherical head, about a third of the total height and
>   noticeably narrower than the base.
> - Directly under the head, a thick rounded collar ring, like a flattened
>   donut, wider than the neck.
> - A short narrow neck, then a body that flares smoothly with gently
>   concave sides.
> - A rounded ring at the bottom of the body, then a flared skirt ending in
>   the widest rounded bottom rim, with a flat underside.
> - Perfectly upright, with no arms, hands, legs or feet.
>
> HEAD AND FACE: the head is turned about 15 degrees toward the viewer's
> right, so the face sits slightly right of center and wraps around the
> sphere.
> - Glasses: thick black rectangular frames with softly rounded corners,
>   slightly oversized, wrapping around the curve of the head. Both temple
>   arms poke out just past the head's silhouette. One curved white glint
>   sits on the upper-left edge of the viewer's left lens.
> - Eyes: half-lidded and smug. Each eye is a thick curved upper eyelid line
>   with a black vertical-oval pupil tucked under it and one tiny white
>   catchlight. Both pupils look slightly toward the viewer's right.
> - Eyebrows: expressive ink brush strokes, thick in the middle and tapering
>   to sharp points at both ends, like calligraphy. The viewer's left
>   eyebrow is raised high in a smooth arch, well above the glasses. The
>   viewer's right eyebrow is lower and angled down toward the nose, its
>   inner end almost touching the top of the frame: a skeptical,
>   know-it-all look.
> - Mouth: a small lopsided closed smirk on the viewer's right side of the
>   face. It is a thin curved ink line rising to the right, ending in a tiny
>   upturned tick. No teeth.
> - No nose, ears, hair, cheeks or blush.
>
> SCARF
> - A slim deep emerald knit scarf with subtle ribbing and the same cel
>   shading, wrapped once around the neck just below the collar ring. The
>   wrap follows the round neck, and the collar ring stays fully visible
>   above it.
> - One end hangs down the front on the viewer's left, to about the middle
>   of the body. Near its tip it has a neat checker pattern in the two
>   emeralds.
> - No fringe.
>
> POSE AND FRAMING: standing, centered, filling about 75% of the canvas
> height, on a plain off-white background with generous padding. Square
> 1:1. Logo-ready and readable at small sizes.
>
> EXPRESSION: clever, curious and a little smug, as if it just spotted the
> winning move.

**Avoid:**

> flat icon style, uniform line weight, geometric line art, dot eyes,
> straight-line eyebrows, rosy cheeks, blush, big sparkly eyes, chibi,
> kawaii, baby proportions, wide grin, arms, hands, hair, sweater vest,
> shirt collar, bow tie, photorealistic 3D render, airbrushed gradients,
> textures, ground shadow, text, letters, chessboard, other chess pieces,
> crown, lime or neon green, busy background

Follow-ups, the favicon and vectorizing work as in revision 2: attach the
chosen image as the exact reference and change one thing at a time.

## Logo brief, revision 3 vest variant (2026-10-12, experiment)

Revision 3 (scarf) is the approved look: two independent runs came out
nearly identical. This variant swaps the scarf for a vest. Every other
section is word-for-word revision 3, so the character stays the same.

An earlier vest made the mascot feel like it needed arms, because it had
armholes and shoulder corners, which outline a human torso. Here the vest
is a seamless knitted wrap that follows the pawn's turned form:
- its top and bottom edges are ribbed bands along the ring curves;
- no armholes, shoulders or side seams;
- the checks narrow toward the sides, so it reads as wrapping a round
  object.

**Prompt:** revision 3's text with the SCARF section replaced by:

> OUTFIT: a fitted sweater vest that wraps the pawn's body like a knitted
> sleeve, so the pawn's silhouette does not change and nothing suggests
> shoulders or arms.
> - The vest covers the body from just below the collar ring down to the
>   rounded ring at the bottom of the body.
> - Its top edge is a ribbed band that circles the neck right under the
>   collar ring, level all the way around and following the neck's
>   elliptical curve. Its bottom edge is a matching ribbed band that follows
>   the elliptical curve just above the bottom ring.
> - Both sides of the vest follow the pawn's outline exactly and continue
>   around the back. No armholes, no shoulder corners or straps, no side
>   seams, no sleeves, no buttons.
> - At the front center, a narrow V-neck is cut into the top band, its point
>   reaching about a third of the way down the body. A crisp white shirt
>   collar peeks out of the V, with two small pointed collar tips just under
>   the collar ring. No other part of the shirt shows.
> - A small black bow tie sits centered at the top of the V, under the
>   collar tips: a round knot with two neat triangular wings.
> - The vest is deep emerald knit with subtle vertical ribbing and the same
>   cel shading, with a neat checker pattern in the two emeralds. The checks
>   follow the curve of the body, getting narrower toward the sides, so the
>   vest visibly wraps around a round form.

**Necktie instead of the bow tie:** replace the bow-tie bullet with:

> - A slim black necktie with a small knot under the collar tips. Its blade
>   runs down the V and tucks into the vest at the V's point.

**Avoid:**

> flat icon style, uniform line weight, geometric line art, dot eyes,
> straight-line eyebrows, rosy cheeks, blush, big sparkly eyes, chibi,
> kawaii, baby proportions, wide grin, arms, hands, armholes, shoulders,
> shoulder straps, sleeves, side seams, buttons, scarf, hair,
> photorealistic 3D render, airbrushed gradients, textures, ground shadow,
> text, letters, chessboard, other chess pieces, crown, lime or neon green,
> busy background

## Logo brief, final (2026-10-12)

Supersedes every earlier revision. The owner chose the vest variant with
the **necktie**. Two runs of the off-white version came out nearly
identical, and the owner approved both images. The saved prompt is that
exact text with the background switched to transparent (2026-10-12), so
the output drops straight onto any page. For an off-white background
instead, change the two background lines back to "Plain off-white
background (#FAF8F3)." and "on a plain off-white background with generous
padding", and remove the last four Avoid entries.

**Main prompt (final, transparent background):**

```text
Generate an image of:
A mascot logo of a chess pawn character with a nerdy, clever personality, drawn as a polished cartoon illustration with real volume: it reads as a rounded, three-dimensional turned-wood chess piece, not a flat icon.

STYLE
- Bold black ink outlines, slightly thicker on the outer silhouette and thinner on inner details, like a hand-inked mascot logo.
- Soft two-tone cel shading: one darker tone per color on the lower-right side of each form, light coming from the upper left, plus small clean highlights.
- No airbrushed gradients, no textures, no drop shadow on the ground.
- Colors: cream ivory body (#F6F3ED) shaded with warm darker cream (#E4DCCB); ink (#191610); deep emerald (#156B4A) with a lighter emerald (#2E8B63) for the checker and highlights; white for the shirt collar, the lens glint and the eye catchlights. Fully transparent background (PNG with an alpha channel), no background color.

BODY: a classic Staunton pawn, seen from slightly above eye level, so every ring shows a gentle elliptical curve.
- A smooth spherical head, about a third of the total height and noticeably narrower than the base.
- Directly under the head, a thick rounded collar ring, like a flattened donut, wider than the neck.
- A short narrow neck, then a body that flares smoothly with gently concave sides.
- A rounded ring at the bottom of the body, then a flared skirt ending in the widest rounded bottom rim, with a flat underside.
- Perfectly upright, with no arms, hands, legs or feet.

HEAD AND FACE: the head is turned about 15 degrees toward the viewer's right, so the face sits slightly right of center and wraps around the sphere.
- Glasses: thick black rectangular frames with softly rounded corners, slightly oversized, wrapping around the curve of the head. Both temple arms poke out just past the head's silhouette. One curved white glint sits on the upper-left edge of the viewer's left lens.
- Eyes: half-lidded and smug. Each eye is a thick curved upper eyelid line with a black vertical-oval pupil tucked under it and one tiny white catchlight. Both pupils look slightly toward the viewer's right.
- Eyebrows: expressive ink brush strokes, thick in the middle and tapering to sharp points at both ends, like calligraphy. The viewer's left eyebrow is raised high in a smooth arch, well above the glasses. The viewer's right eyebrow is lower and angled down toward the nose, its inner end almost touching the top of the frame: a skeptical, know-it-all look.
- Mouth: a small lopsided closed smirk on the viewer's right side of the face. It is a thin curved ink line rising to the right, ending in a tiny upturned tick. No teeth.
- No nose, ears, hair, cheeks or blush.

OUTFIT: a fitted sweater vest that wraps the pawn's body like a knitted sleeve, so the pawn's silhouette does not change and nothing suggests shoulders or arms.
- The vest covers the body from just below the collar ring down to the rounded ring at the bottom of the body.
- Its top edge is a ribbed band that circles the neck right under the collar ring, level all the way around and following the neck's elliptical curve. Its bottom edge is a matching ribbed band that follows the elliptical curve just above the bottom ring.
- Both sides of the vest follow the pawn's outline exactly and continue around the back. No armholes, no shoulder corners or straps, no side seams, no sleeves, no buttons.
- At the front center, a narrow V-neck is cut into the top band, its point reaching about a third of the way down the body. A crisp white shirt collar peeks out of the V, with two small pointed collar tips just under the collar ring. No other part of the shirt shows.
- A slim black necktie with a small knot under the collar tips. Its blade runs down the V and tucks into the vest at the V's point.
- The vest is deep emerald knit with subtle vertical ribbing and the same cel shading, with a neat checker pattern in the two emeralds. The checks follow the curve of the body, getting narrower toward the sides, so the vest visibly wraps around a round form.

POSE AND FRAMING: standing, centered, filling about 75% of the canvas height, on a fully transparent background with small, even padding. Square 1:1. Logo-ready and readable at small sizes.

EXPRESSION: clever, curious and a little smug, as if it just spotted the winning move.

Avoid:
flat icon style, uniform line weight, geometric line art, dot eyes, straight-line eyebrows, rosy cheeks, blush, big sparkly eyes, chibi, kawaii, baby proportions, wide grin, arms, hands, armholes, shoulders, shoulder straps, sleeves, side seams, buttons, scarf, hair, photorealistic 3D render, airbrushed gradients, textures, ground shadow, text, letters, chessboard, other chess pieces, crown, lime or neon green, busy background, background color, painted checkerboard, white halo, outer glow
```

**Follow-ups in the same chat** (ChatGPT sees the history):

Favicon:

```text
Using the necktie mascot from the images above as the exact reference, create an app icon / favicon.
- Show only the head: the same cream spherical head, thick black rectangular glasses, half-lidded smug eyes, tapered brush-stroke eyebrows (viewer's left raised in an arch, viewer's right angled down toward the nose) and the lopsided smirk, with the same slight turn toward the viewer's right. No collar ring, vest, tie or body.
- Simplify it so it still reads at 32×32 and 16×16 pixels. Make the outlines about twice as thick as on the full mascot, reduce the shading to one soft shadow tone, and drop the eye catchlights. Keep one bold glint on the viewer's left lens. Make the glasses and eyebrows slightly larger relative to the head so they survive shrinking.
- A solid deep emerald (#156B4A) background fills the whole square edge to edge, with no rounded corners and no border. The head is centered, about 78% of the canvas width, and fully inside the central 80% of the canvas.
- Square 1:1. No text or letters.
```

Transparent version of the approved image:

```text
Recreate the last full-body mascot image exactly as it is (same character, pose, proportions, colors and line work) but on a fully transparent background: a PNG with an alpha channel. Remove the off-white background completely and keep small, even padding. The bold black outline is the outer edge, with no white halo, no glow and no ground shadow. Don't draw a checkerboard pattern; the background must be real transparency.
```

If the result has a painted checkerboard or an off-white backdrop, use
macOS Finder: right-click the file, then Quick Actions → Remove
Background. The bold outline makes the cut clean.

**Poses and directions** (a Duolingo-style cast). Work in the same chat,
in this order:

1. Turnaround sheet. This gives ChatGPT the character from every side.

```text
Using the necktie mascot from the images above as the exact character reference, create a character turnaround sheet. Show the same character five times in a row, evenly spaced, all the same size and on the same baseline: front view, three-quarter view facing left, side profile facing left, three-quarter view facing right, and back view. Keep everything identical to the reference: pawn shape and proportions, cream color and cel shading, line weight, glasses, brush-stroke eyebrows, half-lidded eyes, smirk, the checkered emerald vest with ribbed bands and V-neck, the white collar and the black necktie. In the side and back views, show the vest wrapping all the way around the body and the glasses' temple arms running back along the head. No arms or hands in any view. The same smug expression in every view. Plain off-white background, no text or labels. Wide 3:2 canvas.
```

2. Expression sheet:

```text
Using the same character, create an expression sheet: a 3×3 grid of the head and collar ring only, all turned the same way as the original, at the same size and in the same style. Left to right, top to bottom: smug (the original); happy and proud; thinking (eyes looking up, one brow raised); surprised (brows high, small round mouth); worried (brows tilted up in the middle, small wavy mouth); celebrating (eyes closed in happy arcs, open smile); encouraging (warm soft smile, gentle eyes); disappointed (droopy lids, flat mouth); talking (mouth open mid-word). Keep the glasses, the brush-stroke eyebrow style and the line work identical. No text or labels. Plain off-white background. Square 1:1.
```

3. One pose per request, from this template:

```text
Using the necktie mascot from the reference images above, keep the character identical (pawn shape and proportions, colors, cel shading, line weight, glasses, brush-stroke eyebrows, vest, collar and necktie) and draw it in a new pose.
POSE: [pose]
EXPRESSION: [expression]
Rules: no arms or hands, ever. Show the pose only through how the whole piece tilts, leans, hops or squashes and stretches, where the head and eyes point, the eyebrows and mouth, and how the necktie moves. One character, full body, the same size and framing as the reference. Fully transparent background (PNG with an alpha channel). No text.
```

Starter poses and where they go:

| Pose | POSE / EXPRESSION | Use |
|---|---|---|
| Look left / right | head and eyes turned to the viewer's left (or right), body leaning slightly that way / curious | beside text or a CTA it "looks at" |
| Thinking | still, eyes up to the viewer's left, a small floating question mark above the head / one brow raised | hints |
| Celebrating | mid-hop, the whole piece tilted 10° and stretched a little taller, necktie flying up, three small emerald sparkles / eyes closed in happy arcs, open smile | puzzle solved, lesson done |
| Oops | leaning back, glasses slightly askew, one small sweat drop / wincing | wrong move |
| Encouraging | leaning forward in a small nod / warm soft smile | try again |
| Explaining | facing the viewer / brows lifted, mouth open mid-word | lessons |
| Peeking | only the head and glasses rising from the bottom edge of the canvas / curious | empty states, 404 |

- **Stay consistent:** one change per request. If it drifts, re-upload the
  approved front image and say "match this exactly".
- **From scratch:** the main prompt, with the HEAD AND FACE direction line,
  POSE AND FRAMING and EXPRESSION replaced by the pose.
- **Animation:** talking and blinking come later from a vector rig of the
  vectorized front view, not from generated frames.

## Brand assets (2026-10-12)

| What | Where | Notes |
|---|---|---|
| Masters (raw generator output) | `apps/web/brand/mascot.png` (transparent, full body) | Versioned, not served. Every served file is built from it or from a pose |
| Poses and directions | `apps/web/brand/poses/`: `mascot-<pose>.png` (celebrating, encouraging, explaining, look-left, look-right, oops-1..3, peeking, thinking, thinking-2) | Paste new variations here, named by use. They're optimized into `apps/web/public/brand/` when a page uses one |
| Hero mascot | `apps/web/public/brand/mascot.webp`, 480×851, 48 KB | Alpha snapped (≥240 → opaque, ≤12 → clear; the generator left the body at 253/255), trimmed with 3% padding, `sharp` lanczos3, WebP q88. Rendered with `next/image` `unoptimized`, since it's already sized |
| Favicon | `apps/web/src/app/icon1.png` (32 px) and `icon2.png` (192 px), with rounded corners | A bust cropped from the mascot master (the top 56% of the trimmed image: head, collar ring, tie), 84% of the width, bleeding off the bottom edge, on light emerald `#2E8B63`. The ball-on-collar shape says "pawn" even at 16 px. The first head-only favicon (2026-10-12) read as a face, not chess, and on `#156B4A` the vest disappeared into the background |
| Apple touch icon | `apps/web/src/app/apple-icon.png`, 180 px, full bleed | The same bust; iOS rounds it itself |

In the hero, the mascot stands in front of the board's lower-left corner,
looking at the board. It's a flat layer outside the 3D rig, positioned
against a `.hero-board` wrapper that also carries the perspective. On wide
screens with motion allowed it rises as you scroll (the nearest parallax
layer, transform only). Its alt text is empty because the wordmark already
names the brand.

## Favicon: toppled king (2026-10-13)

Supersedes the Favicon and Apple touch icon rows of "Brand assets". The
owner found the pawn bust still read as a face, not chess, and chose a
favicon apart from the mascot: a king lying on its side, the gesture for
resigning, so it literally says "checkmate". The mascot stays the logo.
The owner supplied the king's style (a crown-shaped king with teardrop
windows); the prompt describes it in words so the result is our own.

| What | Where | Notes |
|---|---|---|
| Master | `apps/web/brand/king-toppled.png`, 1254 px, transparent | Raw generator output, versioned, not served |
| Favicon | `apps/web/src/app/icon1.png` (32 px), `icon2.png` (192 px), rounded corners | Alpha snapped and trimmed as for the mascot, 92% of the tile width, centered on brand emerald `#156B4A`. The see-through windows show the green, which keeps them readable at 16 px. Without a background the wide king fills half the height and reads as "IB+" |
| Apple touch icon | `apps/web/src/app/apple-icon.png`, 180 px, full bleed | The same at 84% width, for more room on the home screen |

**Prompt (ChatGPT image, from scratch):**

```text
Generate an image of:
An app icon glyph of a single chess king that has been knocked over and lies on its side, the moment after checkmate. Clean, bold and full of character, like a sticker icon, built to stay readable at 16×16 pixels.

STYLE
- Flat illustration with one thick black ink outline of even weight around the silhouette and every inner detail, with softly rounded corners and joins.
- Colors: cream ivory fill (#F6F3ED), one flat shadow tone of warm darker cream (#E4DCCB), ink outline (#191610). Nothing else.
- Light comes from the top. The shadow is one clean flat band along the bottom edge of the piece, inside the outline, following its contour.
- Fully transparent background (PNG with an alpha channel), no background color.

THE KING (described standing upright; it is drawn lying down, see POSE). A short, chunky "crown" king with no long body or neck: just a cross, a big crown and a low base, seen straight from the front.
- Cross: short and chunky with square-cut ends, all four arms the same thickness. Its short stem sits in the dip at the top center of the crown. About a quarter of the piece's height.
- Crown: the largest part, about half the height, and the widest part of the piece. Its outline is a heart with the bottom point cut off flat: two big round lobes at the top left and top right meeting in a small V dip at the center where the cross stands, then the sides curve smoothly down and inward to a narrower flat bottom.
- Two windows cut all the way through the crown, side by side in its middle: mirror-image teardrops, rounded at the top and narrowing to a soft point at the bottom, with their straighter edges facing each other across the center. The background shows through them.
- Base: a low, wide, rounded plinth like a cushion, narrower than the crown's lobes but wider than the crown's bottom, with a gently domed top edge, rounded ends and a flat underside. About a quarter of the height. A thin gap line separates it from the crown.
- No face, no jewels, no points or spikes on the crown, no orb.

POSE AND FRAMING: the king has tipped over to the viewer's right and lies on its side. The base is on the left, the cross is on the right pointing right, and the front of the piece still faces the viewer, so the two windows are now one above the other. It rests on the curve of one crown lobe and the end of the base, so its long axis tilts only slightly, with the cross end a little higher. Centered, filling about 88% of the canvas width, with small even padding. Square 1:1.

Avoid:
text, letters, face, eyes, glasses, arms, hands, sword, blood, cracks, motion lines, impact stars, ground line, ground shadow, chessboard, other chess pieces, pawn, tall Staunton king with a long body or neck, crown points, jewels, orb, fleur-de-lis, 3D render, photorealism, gradients, textures, thin or uneven lines, background color, painted checkerboard, white halo, outer glow
```

Later: the two hugging kings (check + "mate" as in friend) were too
muddy at 16 px for a favicon but suit a bigger spot, such as a drawn-game
screen, the 404 page or the social preview image.
