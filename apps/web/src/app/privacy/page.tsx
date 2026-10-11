import type { Metadata } from 'next';
import Link from 'next/link';
import { REPO_URL } from '@/lib/site';

export const metadata: Metadata = { title: 'Privacy' };

// P1-UI-13: plain-language privacy page. Keep it current as features ship
// (release checklist item 8).
export default function PrivacyPage() {
  return (
    <article className="mx-auto grid max-w-prose gap-6 px-4 py-10 text-sm leading-relaxed [&_h2]:text-lg [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="text-2xl font-semibold">Privacy</h1>
      <p>
        CheckMate is free and open source. We keep only what the features need, and we never sell or share your data.
      </p>

      <section className="grid gap-2">
        <h2>What we store, and why</h2>
        <ul>
          <li>
            <strong>Your account:</strong> email, username, display name and a hashed password, so you can sign in. We
            never store or log the password itself.
          </li>
          <li>
            <strong>Sessions:</strong> the device and IP address of each signed-in session, so you can see and end them,
            and so we can limit repeated sign-in attempts.
          </li>
          <li>
            <strong>Preferences:</strong> board, pieces, sounds, theme and engine settings, so they follow you.
          </li>
          <li>
            <strong>What you create:</strong> studies, puzzle attempts, analysis sessions and saved game reviews, as
            each of those features arrives. Later, games you import and the Lichess or Chess.com accounts you choose to
            link.
          </li>
        </ul>
      </section>

      <section className="grid gap-2">
        <h2>Who sees it</h2>
        <p>
          Only you. Nothing is sold, shared, or used for ads. There are no trackers or analytics. Engine analysis runs
          in your own browser.
        </p>
      </section>

      <section className="grid gap-2">
        <h2>Password breach check</h2>
        <p>
          When you choose a password, we check it against known data breaches using Have I Been Pwned. Only the first 5
          characters of a hash of your password are sent, never the password, so the service can’t tell what it is.
        </p>
      </section>

      <section className="grid gap-2">
        <h2>Emails</h2>
        <p>
          We send email only to verify your address and to reset your password. While CheckMate is in a small early
          release, these links may be passed to you by the operator directly.
        </p>
      </section>

      <section className="grid gap-2">
        <h2>Deleting your data</h2>
        <p>
          <Link href="/settings" className="text-primary underline">
            Settings
          </Link>{' '}
          → Account → Delete account removes your account and everything in it right away. A download of all your data
          is coming before CheckMate opens to the public.
        </p>
      </section>

      <section className="grid gap-2">
        <h2>Contact</h2>
        <p>
          Questions or requests: open an issue on{' '}
          <a href={`${REPO_URL}/issues`} className="text-primary underline">
            GitHub
          </a>
          .
        </p>
      </section>
    </article>
  );
}
