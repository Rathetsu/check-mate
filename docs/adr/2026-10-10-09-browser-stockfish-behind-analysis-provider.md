# Browser Stockfish WASM behind an AnalysisProvider interface

Date: 2026-10-10
Status: Accepted

## Decision

In Phases 1-3, engine analysis runs client-side using the npm `stockfish`
package (nmrugg/stockfish.js, Stockfish 19, GPL-3.0), always inside a Web
Worker.

**Builds:**
- **Lite NNUE is the default.** It is multi-threaded when the page is
  `crossOriginIsolated`, otherwise single-threaded.
- **Full NNUE (~94 MB) is opt-in.** It is cached after the first download.

**COOP/COEP headers** (`same-origin` / `require-corp`) are sent **only** on
routes that run the engine.

**One interface.** All engine use goes through the `AnalysisProvider`
interface in `packages/chess`, which has four operations:
- `analyzePosition`
- `getBestMoves`
- `evaluateLine`
- `validateVariation`

The interface's results are engine-agnostic and carry provenance: engine,
version, flavor, depth, nodes, and where it ran.

## Context

The brief requires browser Stockfish now, that the UI thread is never
blocked, and that a move to server engines (Stockfish cluster, Lc0,
Patricia) in Phase 4 needs no frontend rewrite.

Package facts checked 2026-10-10:
- Multi-threaded builds need `SharedArrayBuffer`, which requires cross-origin
  isolation.
- COEP blocks cross-origin resources that lack CORP.
- `credentialless` is unsupported in Safari.

## Alternatives rejected

- **lichess-org/stockfish-web** — its README says it is tuned for lichess.org
  and points third parties to stockfish.js. Its LICENSE (GPL) and
  package.json (AGPL) disagree.
- **Server-side engines in Phases 1-3** — the brief defers them; costs CPU
  per user.
- **COOP/COEP site-wide** — breaks third-party embeds, avatars and popup
  OAuth for no benefit on non-engine pages.
- **Full NNUE by default** — a 94 MB first load on mobile.

## Consequences

- Only the provider implementation may import `stockfish` or parse UCI text.
  Everything else uses the provider's types.
- `validateVariation` checks legality through the rules layer first and only
  then asks the engine.
- Scores are reported from White's point of view (`cp` or `mate`).
- Browser-computed evaluations are not stored as truth; Phase 4 recomputes
  them server-side.
- Lichess OAuth must use the redirect flow, because COOP breaks popups.
