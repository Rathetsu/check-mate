// The single Better Auth instance (2026-10-10-10). It lives in core because
// it needs the Drizzle adapter, and apps may not import drizzle (CORE-03).
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { haveIBeenPwned, username } from 'better-auth/plugins';
import { db } from './db.ts';
import { sendEmail } from './email.ts';
import * as schema from './schema/index.ts';

const DAY = 60 * 60 * 24;

// Emails are not awaited, so response timing doesn't reveal whether an
// account exists (P1-AC-03).
const mail = (to: string, subject: string, text: string) => {
  sendEmail({ to, subject, text }).catch((err: unknown) => console.error('[email] send failed', err));
};

export const auth = betterAuth({
  appName: 'CheckMate',
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10, // P1-AC-01
    requireEmailVerification: false, // P1-AC-02, until the 2026-10-11-03 trigger
    resetPasswordTokenExpiresIn: 60 * 60, // P1-AC-03
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) =>
      mail(user.email, 'Reset your CheckMate password', `Reset your password: ${url}\nThis link expires in 1 hour.`),
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) =>
      mail(user.email, 'Verify your CheckMate email', `Verify your email: ${url}`),
  },
  user: {
    changeEmail: { enabled: true }, // P1-AC-08: verification goes to the new address
    deleteUser: { enabled: true }, // P1-AC-10: FK cascades remove everything
  },
  // P1-AC-04: DB sessions, 7-day rolling expiry. No cookie cache (the default),
  // so a revoke takes effect on the next request.
  session: { expiresIn: 7 * DAY, updateAge: DAY },
  // P1-AC-05: on in every environment (Better Auth disables it in dev by default).
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 60, max: 10 },
      '/sign-in/username': { window: 60, max: 10 },
      '/sign-up/email': { window: 60, max: 5 },
      '/request-password-reset': { window: 60, max: 5 },
    },
  },
  // Caddy replaces client-sent X-Forwarded-For with the real peer address.
  advanced: { ipAddress: { ipAddressHeaders: ['x-forwarded-for'] } },
  plugins: [
    // P1-AC-01: Lichess username rules; stored lowercased, so unique
    // case-insensitively.
    username({
      minUsernameLength: 2,
      maxUsernameLength: 20,
      usernameValidator: (name) => /^[A-Za-z0-9_-]+$/.test(name),
    }),
    haveIBeenPwned(),
  ],
  databaseHooks: {
    user: {
      update: {
        // Usernames are immutable after sign-up (P1-AC-01).
        before: async (data) => !('username' in data || 'displayUsername' in data),
      },
    },
  },
});
