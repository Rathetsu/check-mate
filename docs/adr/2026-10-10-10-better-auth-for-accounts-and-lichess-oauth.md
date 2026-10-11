# Better Auth for accounts and Lichess account linking

Date: 2026-10-10
Status: Accepted

## Decision

Better Auth (1.7.x, MIT) with its Drizzle Postgres adapter handles all
CheckMate authentication. It provides:
- email + password sign-up with email verification
- password reset
- DB-backed sessions with list/revoke
- built-in rate limiting

Linking a Lichess account uses Better Auth's `genericOAuth` plugin as a
**public PKCE client**:
- authorize at `https://lichess.org/oauth`, token at
  `https://lichess.org/api/token`
- no client secret, no scopes
- redirect flow, not a popup

Chess.com accounts are linked by username only, because Chess.com offers no
third-party OAuth.

## Context

The brief needs secure registration, login/logout, password reset and
persistent sessions. Phase 3 also needs several external chess identities per
user.

Checked 2026-10-10:
- Auth.js joined Better Auth on 2025-09-22 and now gets security fixes only.
- Vercel acquired Better Auth on 2026-07-07; it remains MIT and
  framework-agnostic.
- Lichess OAuth is PKCE S256 only, with self-chosen client ids. Tokens last
  about a year and cannot be refreshed. Reading public games and the explorer
  needs no scope.

## Alternatives rejected

- **Auth.js / NextAuth v5** — in maintenance mode, and v5 never left beta.
- **Lucia** — deprecated by its author.
- **Hand-rolled auth** — security-critical code we would have to own.
- **Lichess as a sign-in provider** — users must not need a Lichess account;
  Lichess is linked, not used to sign in.

## Consequences

- Auth tables come from Better Auth's generator and are migrated with
  drizzle-kit, like every other table.
- Lichess tokens are stored encrypted at rest. Because they can't be
  refreshed, a 401 marks the link `needs_reauth`.
- Lichess `/api/account` doesn't return an email without a scope, so a
  custom `getUserInfo` maps the Lichess id and username.
- Revisit if Better Auth's licensing or Vercel coupling changes.
