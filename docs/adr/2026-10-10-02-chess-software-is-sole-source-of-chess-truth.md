# Chess software is the sole source of chess truth

Date: 2026-10-10
Status: Accepted

## Decision

Every chess fact CheckMate shows or stores comes from one of three
deterministic truth layers, never from an LLM or hand-written heuristics:

| Layer | Owns | Implementation (Phases 1-3) |
|---|---|---|
| Rules | legality, move generation, board state, check/mate/stalemate/draws, castling, en passant, FEN/PGN validation, move application | `packages/chess` over chessops (2026-10-10-07-chessops-is-the-rules-layer) |
| Analysis | evaluations, best/candidate moves, PVs, tactical calculation, mistake classification | `AnalysisProvider`, browser Stockfish (2026-10-10-09-browser-stockfish-behind-analysis-provider) |
| Knowledge/Data | opening stats, opening names/ECO, master games, user games, puzzle data, player history | Explorer service + Postgres (2026-10-10-14-self-hosted-opening-explorer-from-licensed-data, 2026-10-10-15-personal-opening-tree-as-derived-postgres-index) |

The Phase 4 LLM sits above these layers, never beside them. Every chess
fact carries provenance: `rules`, `engine{id, version, depth}`, or
`dataset{source, license}`.

## Context

The brief's non-negotiable rule: the LLM explains; chess software decides.
Phase 4 will feed engine and database output to an LLM, so outputs must be
structured and attributable from Phase 1 on. This applies even when an answer
looks obvious (e.g. "is this mate?").

## Alternatives rejected

- **LLM reasons about positions, engine double-checks sometimes** — produces
  confident fabricated variations; the brief forbids it outright.
- **Exempt "obvious" claims** — there is no reliable line between obvious and
  subtle; one exemption is how invented chess facts leak in.

## Consequences

- No code may decide legality, mate, or evaluation except through the rules
  layer or an `AnalysisProvider`.
- Engine results carry engine id, version, depth and where they ran.
  Evaluations imported from PGN `[%eval]` are tagged `imported`, never shown
  as CheckMate engine output.
- Opening names come only from a classification dataset. Unclassified
  positions show no name.
- When data is missing, the UI says so. It never fills the gap.
