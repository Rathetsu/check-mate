# Spec: Accounts and preferences

Date: 2026-10-10
Status: Approved (design; no code yet)
Phase: 1 · Milestone M1.0

## Goal

Users can register, sign in and out, reset their password, manage sessions,
edit a basic profile and settings, and delete their account. The schema
already supports several external chess accounts per user; Phase 3 fills
them in.

Decisions: 2026-10-10-10-better-auth-for-accounts-and-lichess-oauth ·
2026-10-10-11-raw-player-data-append-only-aggregates-derived ·
2026-10-11-03-soft-launch-without-email-service.

## Scope

In: email/password auth, email verification (sent, not required), password
reset, sessions, profile, preferences, account deletion, `external_accounts`
table.
Out: social sign-in, MFA (COULD later; Better Auth supports it), avatars,
public profiles, linking flows (Phase 3), account data export (deferred,
P1-AC-12).

## User flows

1. **Register:** email + password + display name → signed in. A verification
   email is sent; clicking the link marks the email verified.
2. **Sign in / out:** email + password → session cookie. Sign out revokes the
   current session.
3. **Forgot password:** enter email → always show the same "check your inbox"
   message → reset link (single use, expires) → new password → every other
   session is revoked.
4. **Settings:** profile, board and pieces, sounds, theme, engine defaults,
   sessions (list and revoke), danger zone (delete account).
5. **Delete account:** re-enter password → all user data is cascade-deleted →
   signed out.

## Requirements

- **P1-AC-01 MUST** Registration with email, password (min 10 chars, checked
  against breached passwords by Better Auth's `haveIBeenPwned` plugin, which
  sends only a 5-character hash prefix) and display name.
- **P1-AC-02 MUST** A verification email is sent on sign-up, but
  verification is **not required**: unverified users can sign in and save
  everything. `requireEmailVerification` stays `false` until the trigger in
  2026-10-11-03-soft-launch-without-email-service.
- **P1-AC-03 MUST** Password reset by emailed single-use link that expires
  after 1 hour. The response never reveals whether the email exists.
- **P1-AC-04 MUST** Sessions stored in the DB, 7-day rolling expiry, list
  and revoke from settings. No cookie cache, so revoking takes effect
  immediately.
- **P1-AC-05 MUST** Rate limiting on sign-in, sign-up and reset endpoints
  (Better Auth built-in). Enabled explicitly in every environment, because
  Better Auth turns it off in development by default.
- **P1-AC-06 MUST** Passwords hashed with Better Auth's default (scrypt) or
  Argon2. Never logged.
- **P1-AC-07 MUST** One `sendEmail` function. When the SMTP env vars are set,
  it sends over SMTP (provider agnostic, nodemailer). When they are not, it
  writes the link to the server log for the operator to pass on. Mailpit in
  development and CI.
- **P1-AC-08 MUST** Profile: display name (editable), email (change sends a
  verification link to the new address, through `sendEmail`).
- **P1-AC-09 MUST** Preferences persisted per user (see data model) and
  applied on every page. Anonymous users get defaults, stored locally.
- **P1-AC-10 MUST** Account deletion cascades to every user-owned row
  (CORE-50).
- **P1-AC-11 MUST** `external_accounts` table exists from M1.0 (empty until
  Phase 3) so one user can hold many Lichess/Chess.com identities.
- **P1-AC-12 DEFERRED** (not in Phase 1, per
  2026-10-11-03-soft-launch-without-email-service) Data export: download all
  of the user's raw data (studies PGN, puzzle attempts CSV, later games PGN)
  as a zip. Ships at that ADR's trigger.

## Data model

Better Auth generates `user`, `session`, `account`, `verification`. The
`account` table also stores the Lichess OAuth link in Phase 3. Better Auth's
default text ids are kept, so every `user_id` foreign key in CheckMate is
`text`. CheckMate adds:

```
user_preferences (user_id PK FK → user ON DELETE CASCADE,
  theme            text  -- 'system' | 'light' | 'dark'
  board_theme      text  -- from allowlist, default 'brown'
  piece_set        text  -- from allowlist, default 'cburnett'
  sound_set        text  -- from allowlist or 'off'
  show_coords      bool, move_input text ('both'|'drag'|'click'),
  animation_ms     int, show_legal_dests bool,
  board_size_px    int null,
  engine_enabled   bool default true,
  engine_flavor    text  -- 'lite' | 'full'
  engine_multipv   int  default 1 (1-5),
  engine_depth     int  null = infinite,
  updated_at       timestamptz)

external_accounts (id uuid PK, user_id FK CASCADE,
  platform          text  -- 'lichess' | 'chesscom'
  username          text, platform_user_id text,
  auth_account_id   FK → account (nullable; Lichess OAuth link)
  needs_reauth      bool default false,
  linked_at, last_synced_at timestamptz,
  UNIQUE (user_id, platform, lower(username)))
```

## API surface

- Better Auth handler mounted at `/api/auth/*`.
- `GET/PUT /api/v1/me/preferences`
- `GET /api/v1/me` (profile + linked accounts summary)
- `DELETE /api/v1/me` (with password confirmation)
- `POST /api/v1/me/export` (deferred with P1-AC-12)

## Reuse

| Component | Mode |
|---|---|
| Better Auth + Drizzle adapter | reused |
| Better Auth `haveIBeenPwned` plugin (HIBP range API) | reused |
| nodemailer | reused |
| Settings UI | independent (shadcn/ui) |

## Chess-authority notes

None. This feature makes no chess claims.

## Phase 4 hooks

`external_accounts` and preferences are readable via `/api/v1/me`. Engine
preferences become defaults for server-side analysis later.

## Acceptance criteria

- Playwright: register → signed in without verifying → save works → verify
  via the Mailpit link → sign out → reset password (Mailpit) → old sessions
  are revoked → sign in with the new password.
- Unit: with no SMTP env vars, `sendEmail` logs the link and does not throw.
- Playwright: change piece set and theme → reload → settings persist. Signed
  out → defaults apply.
- Deleting the account removes rows in every user-owned table (test seeds one
  row per table, then asserts zero remain).
- Cross-user test: user B cannot read user A's preferences (CORE-52).
- Hitting sign-in 20 times in a minute returns 429.

## Open questions

- Transactional email provider for production (Postmark, SES, Resend). Pick
  at the 2026-10-11-03-soft-launch-without-email-service trigger; only SMTP
  env vars change.
