# Spec: home page motion (logo, living hero, ambient motion)

Date: 2026-10-13
Status: Built (2026-10-13)
Supersedes, in 2026-10-11-ui-refresh.spec.md: the Home hero's scroll
motion, its fallback and its C50 position.

Decisions: 2026-10-13-01-home-hero-replays-a-historical-game.

## Goal

The owner asked for three things:
- a logo mark next to "CheckMate" in the sidebar;
- a real redesign of the hero's parallax, which felt bolted on;
- more motion that isn't tied to scrolling, in the spirit of their company
  site (https://dropsite-five-pi.vercel.app/).

That site's character comes from:
- a typewriter headline;
- a node network that keeps drifting;
- a cursor readout;
- a marquee ticker;
- an animated pipeline diagram;
- mono, technical labels.

All of it runs on its own clock.

## What was built

| Item | What it does | Where |
|---|---|---|
| Sidebar mark | The favicon's toppled-king tile (28px) beside the wordmark. Alone on the icon rail, replacing "CM". Also in the phone top bar | `components/shell/app-shell.tsx` (static import of `src/app/icon2.png`) |
| Living hero | Replays the Opera Game; the layers part on checks (loop below) | `lib/hero-game.ts`, `components/home/hero.tsx`, `styles/hero.css` |
| Pointer parallax | On the board only. Tilt up to ±10° toward the cursor, layers held apart, the mascot shifting the other way | `hero.tsx` |
| Square readout | The square's name next to the cursor at 45% opacity. Name only, so it doesn't pull focus | `hero.tsx` |
| Mascot poses | Base, thinking, explaining, celebrating, crossfading, with a slow idle bob | `scripts/gen-mascot.ts`, `public/brand/mascot*.webp` |
| Typewriter h1 | "Your coach sees…" `the threat.` / `the plan.` / `what you missed.` / `all of them.` | `components/home/typewriter.tsx` |
| Backdrop | A dot field, a–h and 8–1 at the edges, and lines that draw and retract (wide screens only) | `hero.tsx`, `hero.css` |
| Openings ticker | Famous White openings and Black defenses, interleaved, each linking to `/analysis/<fen>` | `components/home/ticker.tsx`, `lib/hero-game.ts` |
| Card vignettes | Analysis: an arrow draws itself. Editor: a knight drops. Studies: chapters light up in turn | `components/home/vignettes.tsx` |
| Pause motion | One button that stops every self-moving thing (WCAG 2.2.2) | `components/home/motion.tsx` |

## The hero loop

| Step | What happens |
|---|---|
| First paint | The final frame: the king toppled, the mascot celebrating, the layers parted. This is also the reduced-motion and no-JS still |
| After 2 s | The pieces fade out and the board resets to the start. The mascot is "thinking" |
| Each move, 1.6 s | Pieces slide (Web Animations, transform only) and shading crossfades. The changed squares get chessground's last-move tint, never `--primary` (P1-UI-14) |
| Checks and every 8th ply, 2.6 s | The layers lift apart. Live labels show PIECES (the move), CONTROL (white and black square counts) and BOARD (from→to). The mascot is "explaining" |
| 17.Rd8# | The black king falls on its side, like the favicon. The mascot celebrates. It holds for 5 s, then loops |

**Sources of truth:**
- moves from `loadGame`
- shading from `squareControl`
- the opening name from `classifyLine`
- the mate from `gameStatus`

No evals, no invented names. One loop takes about 70 s.

**Playback stops when:**
- Pause is pressed
- reduced motion is on
- the tab is hidden
- the hero is off-screen (IntersectionObserver)

## Accessibility

- **Pause.** `<button aria-pressed>` "Pause motion" sits in the hero
  caption. It freezes:
  - the replay (JS)
  - the typewriter (JS)
  - every CSS loop, through `[data-paused]`
- **Reduced motion.** The mate still, a static h1, a ticker you can scroll
  instead of a marquee, no backdrop lines, still vignettes, and no Pause
  button (nothing moves).
- **Screen readers.**
  - The h1 reads "Every move has layers. Your coach sees all of them."
  - The board is `aria-hidden`, and the caption describes it.
  - Ticker items read "White: Italian Game". The duplicate track is hidden
    and taken out of the Tab order.
- **Keyboard.** The ticker holds still on hover and on focus.

## Decisions (asked one by one, 2026-10-13)

| Item | Answer |
|---|---|
| Sidebar mark | Toppled-king tile |
| Hero concept | Live game; the layers part on key moves |
| Typewriter | Build |
| Openings ticker | Build, **without ECO codes** (not meaningful to most players), mixing White and Black openings |
| Square readout | **Name only**, low opacity |
| Backdrop | Build |
| Card vignettes | Build |
| Count-up stats row | **Won't do** |

**Won't do:**
- **"Most popular" in the ticker.** CheckMate has no popularity data. The
  list is curated, and each name must exist in the openings table or it
  drops out.
- **ECO codes in the ticker.**
- **A stats row.**

## Checks

- `apps/web/src/lib/hero-game.test.ts` covers three things:
  - 34 frames, with the mate on e8
  - the slides for O-O-O and for Rxd7
  - all 20 ticker links open a valid position
- `apps/web/e2e/home.spec.ts` covers two things:
  - Pause holds the replay
  - reduced motion keeps the still, and a ticker opening opens on the board
    with its name
