import type { Metadata } from 'next';
import attributions from '@/generated/attributions.json';
import { REPO_URL } from '@/lib/site';

export const metadata: Metadata = { title: 'About & attributions' };

// P1-UI-08 / release checklist item 5. The lists are generated from
// docs/wiki/open-source-reuse.md by scripts/check-register.ts.
export default function AboutPage() {
  const { components, datasets, assets } = attributions;
  return (
    <article className="mx-auto grid max-w-3xl gap-8 px-4 py-10 text-sm leading-relaxed [&_h2]:text-lg [&_h2]:font-semibold">
      <header className="grid gap-2">
        <h1 className="text-2xl font-semibold">About CheckMate</h1>
        <p>
          CheckMate is free software under the GNU Affero General Public License v3.0 or later. The source code is on{' '}
          <a href={REPO_URL} className="text-primary underline">
            GitHub
          </a>
          . It stands on the shoulders of these projects and datasets.
        </p>
      </header>

      <section className="grid gap-2">
        <h2>Software</h2>
        <ul className="grid gap-1">
          {components.map((c) => (
            <li key={c.name}>
              {c.upstream ? (
                <a href={`https://${c.upstream}`} className="underline">
                  {c.name}
                </a>
              ) : (
                c.name
              )}{' '}
              <span className="text-muted-foreground">· {c.license}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-2">
        <h2>Data</h2>
        <ul className="grid gap-1">
          {datasets.map((d) => (
            <li key={d.name}>
              {d.name} <span className="text-muted-foreground">· {d.terms}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-2">
        <h2>Artwork</h2>
        <ul className="grid gap-1">
          {assets.map((a) => (
            <li key={a.name}>
              {a.name} <span className="text-muted-foreground">· {a.license}</span>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
