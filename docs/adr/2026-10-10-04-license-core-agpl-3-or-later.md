# License CheckMate Core under AGPL-3.0-or-later

Date: 2026-10-10
Status: Accepted · legal-review consequence refined by 2026-10-10-17-self-administered-license-compliance

## Decision

CheckMate Core is licensed AGPL-3.0-or-later. Every running instance links
to its exact source from the app footer ("Source"). Every third-party
dependency, asset and dataset gets a row in `docs/wiki/open-source-reuse.md`
with its verified license and obligations **before** it is merged. Only
allowlisted assets ship.

## Context

Verified 2026-10-10 (sources in the reuse register):
- chessground, chessops and the npm `stockfish` engine are GPL-3.0-or-later.
  Shipping them to browsers is conveyance; chessground's README says your
  site's source must be released.
- lila and lila-openingexplorer are AGPL-3.0-or-later. Adapting any lila
  code makes the combined work AGPL.
- GPLv3 §13 permits combining GPLv3 and AGPLv3 code.
- lila's COPYING.md shows many piece sets are CC BY-NC-SA, `alpha` is
  non-commercial, several sets are "freeware" or unlicensed, and lila's
  default sounds and other artwork carry no license.

The user chose AGPL (2026-10-10 session) over GPL.

## Alternatives rejected

- **GPL-3.0-or-later** — forbids adapting any lila code (editor logic, puzzle
  move test, etc.). A hosted fork could also withhold its changes.
- **Proprietary Core** — impossible while using chessground, chessops or
  Stockfish WASM in the browser.
- **Permissive board (react-chessboard, MIT) to dodge copyleft** — loses
  Lichess-grade board UX, and the brief demands reuse of Lichess tech.

## Consequences

- Source must be available to every network user, including for modified
  deployments.
- Assets allowed: pieces cburnett, merida, mono (GPLv2+), mpchess (GPLv3+),
  staunton, fantasy, spatial, celtic (MIT), chessnut (Apache-2.0), rhosgfx
  (CC0), kiwen-suwi, firi (CC BY 4.0, attribution); lila board images
  (AGPL); Enigmahack sound sets (AGPL). Every NC set, alpha, the freeware
  sets, the lichess logo and the unlicensed lila sounds and art are banned.
- CC BY-SA data (Lichess broadcasts) needs attribution in the UI.
- The proprietary AI stays outside (2026-10-10-03).
- Legal review before commercial launch.
