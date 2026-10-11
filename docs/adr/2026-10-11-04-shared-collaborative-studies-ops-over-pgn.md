# Shared, collaborative studies: tree operations over PGN

Date: 2026-10-11
Status: Accepted. Supersedes the save model of 2026-10-10-13-study-chapters-stored-as-pgn; PGN stays the stored format.

## Decision

Studies get Lichess parity minus chat:
- visibility public / unlisted / private, plus per-study settings
- clone, likes, topics, public browse, embed
- members (contributor / viewer) invited by **unique username**
- live sync

**Edits are server-applied tree operations.** The client posts an op: add
move, delete, promote, comment, glyph, shapes, tags or gamebook text. The
server:
- locks the chapter row (`FOR UPDATE`)
- applies the op with `TreeCursor` from `packages/chess`
- writes the PGN back and bumps `version`
- publishes the op

Members receive ops and position changes over SSE. Pub/sub is in-process,
because there is one web container (2026-10-10-16). This is the only write
path. Whole-chapter `PUT` remains only for "replace chapter".

**What standard PGN can't hold** goes in comment commands, which CheckMate
strips on export unless "CheckMate extensions" is chosen:
- gamebook hint and deviation text: `[%cm-hint]`, `[%cm-deviation]`
- comment author: `[%cm-by]`

**Access.** Every study read and write goes through one `studyAccess(userId |
null, studyId)` gate in `packages/core`. It returns owner, contributor,
viewer, reader or none, and "none" answers 404.

## Context

The user (2026-10-11) asked for Lichess studies minus chat, all in M1.4.
ADR 13's whole-chapter save with a version check fits one editor. With
several live editors it turns into constant conflicts. Lichess sends per-node
ops over websockets. Applying the same ops to the stored PGN keeps a single
serialization and needs no new tree storage. Usernames are needed so
collaborators can be found and invited the way Lichess does it.

## Alternatives rejected

- **Per-node table or JSON tree (lila-style)** — a second serialization that
  has to stay in sync with PGN import and export, for no gain at MVP scale.
- **Whole-PGN saves with 409s** — unusable once two people edit at once.
- **WebSockets** — Next.js route handlers can't serve them without a custom
  server. SSE plus POST covers one-way pushes.
- **Invite by email** — reveals which emails have accounts, and public
  studies would show non-unique display names.

## Consequences

- P1-ST-05 (whole-PGN autosave with 409) and P1-ST-11 (private only) are
  replaced by the M1.4 studies spec rewrite.
- `/privacy` must say public studies and usernames are visible to anyone.
- Each op costs a PGN parse and write (500 KB cap). If that's too slow, cache
  the parsed tree per chapter in-process, keyed by version.
- More than one web container needs Postgres `LISTEN/NOTIFY` in place of
  in-process pub/sub.
- Chat stays out of scope.
