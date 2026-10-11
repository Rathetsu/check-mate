# Mate Green replaces Mate Violet as the brand accent

Date: 2026-10-11
Status: Accepted. Changes the Brand section of the UI shell spec (P1-UI-14).

## Decision

`--primary` is **Mate Green**: `oklch(0.47 0.095 162)` ≈ `#156B4A` (light)
and `oklch(0.76 0.12 160)` ≈ `#64C897` (dark). Light neutrals become warm
eggshell (hue 85) and dark neutrals hue 160. The reserved-color rule is
unchanged: board squares and highlights, arrows, eval and W/D/L bars, and
move quality never use `--primary`.

## Context

The product owner chose green and asked for a shade that works, but violet
shipped. The spec had picked violet because no chess convention uses it.
Green overlaps the "good move" color and the green arrow (`#15781B`), and
the overlap is accepted:
- primary never appears on the board or in move-quality UI;
- hue 162 leans blue, while the arrow is about 142 and "good" greens are
  yellower;
- Chess.com's lime (`#81B64C`, much lighter) stays clearly different.

Contrast (2026-10-11): white on primary 6.5:1, primary text on the
background 5.9:1, the selected nav item 5.1:1, dark primary 9.2:1.

## Alternatives rejected

- **Keep violet:** it ignores the owner's choice.
- **Teal (hue 175-185):** further from the reserved greens, but it reads as
  teal.
- **A bright lime green:** too close to Chess.com and to "good move".

## Consequences

- Tokens live in `apps/web/src/app/globals.css`; the favicon uses `#156B4A`.
- A future "good move" color must keep a clearly different hue and
  lightness from `--primary`, and must never use the token.
