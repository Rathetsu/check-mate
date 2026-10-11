# Record architecture decisions as ADRs

Date: 2026-10-10
Status: Accepted

## Decision

Significant technical decisions are recorded as ADRs in `docs/adr/`, written
in the same session the decision is made. Accepted ADRs are never edited,
only superseded. Filenames are `YYYY-MM-DD-NN-slug.md`; references use the
slug. Specs and plans live in `docs/stream/`; current truth lives in
`docs/wiki/`. `docs/index.md` is the map.

## Context

CheckMate is built AI-first: most code will be written by agents across many
sessions and parallel worktrees. Decision rationale otherwise lives in chat
sessions that are lost. ADRs are the persistent memory layer for humans and
agents alike, and they stop agents from re-proposing rejected options.

## Alternatives rejected

- **Single DECISIONS.md** — grows until no agent can afford to load it; merge
  conflicts between parallel agents.
- **Sequential ADR numbers only** — parallel worktrees allocate the same
  number concurrently; dates plus slugs merge cleanly.
- **Commit messages as the record** — commits record activity, not rejected
  alternatives or constraints.

## Consequences

- A task that makes an ADR-worthy decision is not done until the ADR exists
  (doc gate in `CLAUDE.md`).
- Changing an accepted decision means writing a new ADR with
  `Status: Accepted` and marking the old one `Superseded by <slug>`.
