# The home hero replays a historical game on a clock

Date: 2026-10-13
Status: Accepted. Changes the Home hero in 2026-10-11-ui-refresh.spec.md
(scroll motion and the C50 position).

## Decision

The home hero's exploded board replays **Morphy's Opera Game** (Paris,
1858) on a loop, driven by a timer rather than by scrolling.
- **Where the frames come from.** The server builds one frame per position
  from the PGN, using only the rules layer: `loadGame`, `boardSquares`,
  `squareControl`, `classifyLine` and `gameStatus`. An illegal move throws.
- **What it shows.** It shows no evals. The opening name comes from the
  openings table. The mated king topples on 17.Rd8#.
- **The layers.** They part on checks and every eighth ply, and while the
  pointer is over the board.
- **The scroll timeline is removed.** That was the 200vh pinned section.
- **Pause control.** Everything on the page that moves on its own stops for
  one Pause control (WCAG 2.2.2) and for reduced motion.
- **The game record.** It is public domain: a game record is facts, and
  this one is from 1858. It has a register row.

## Context

The owner found the scroll parallax bolted on. It only moved while you
scrolled through a pinned section, and the frozen position meant the
parted layers revealed nothing new. They asked for motion that isn't tied
to scrolling, like their company site, and kept the parallax only if it
earns its place. Replaying a real game gives the layers something to show
on every move: shading that changes, last-move squares, a checkmate. That
fits the headline: "Every move has layers. Your coach sees all of them."

## Alternatives rejected

- **Keep one position and peel it on hover:** least work, but nothing moves
  unless you hover.
- **Same replay, but the layers part only on hover:** calmer, but first-time
  visitors may never see the layers part.
- **Show engine evals beside the replay:** a persisted eval would be a
  browser eval treated as truth (2026-10-10-09), so no.
- **Rotate several famous games:** more data to register and check, and no
  gain yet. The frame format allows it later.

## Consequences

- `apps/web/src/lib/hero-game.ts` builds the frames and the ticker list on
  the server, so chessops stays off the client. `hero-game.test.ts` pins
  the mate square and the castling and capture slides.
- Every browser now gets the motion, Firefox included, since the scroll
  timeline is gone. The still pose (the final mate) is the first paint, the
  reduced-motion view and the no-JS view.
- Any new looping motion on the home page must stop for `[data-paused]`
  and reduced motion.
