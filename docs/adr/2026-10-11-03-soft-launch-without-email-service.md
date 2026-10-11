# Soft launch without an email service

Date: 2026-10-11
Status: Accepted

## Decision

The first release is a soft launch for fewer than 5 users. It must run with no
domain and no email service.

- **Email verification is sent but not required.** Users can sign in and save
  everything before they verify. Better Auth's `requireEmailVerification`
  stays `false`.
- **Email is optional.** One `sendEmail` function sends over SMTP when the
  SMTP env vars are set. Otherwise it writes the link (verification, password
  reset, email change) to the server log, and the operator passes it on.
  Mailpit covers development and CI.
- **Account data export (P1-AC-12) is deferred** out of Phase 1. Release
  checklist item 8 requires account deletion only, and `/privacy` says
  export is coming.

**Revisit trigger:** before marketing starts or sign-ups open to the public.
At that point, set SMTP, turn on `requireEmailVerification`, and ship
data export.

## Context

The user (2026-10-11) won't pay for a domain or an email service until
marketing starts, and production must not be blocked on them. Password reset
needs email too, so the log fallback keeps it working. With fewer than 5 known
users, unverified sign-ups and handing on links by hand are acceptable risks.

## Alternatives rejected

- **Require verification** — blocks every sign-up until an email service
  exists.
- **Remove email features until launch** — rebuild work later. Better Auth
  makes them nearly free to build now against Mailpit.
- **Background export job with an emailed link** — needs file storage and
  email. Overkill for 5 users.

## Consequences

- Refines the export obligation in
  2026-10-10-17-self-administered-license-compliance until the trigger fires.
- Reset and verification tokens can appear in server logs. Logs stay on the
  host and are never shipped off-box.
