// Release checklist items 2, 3 and 10 (docs/wiki/open-source-reuse.md, the
// single source). It checks that every direct dependency and asset directory
// has a register row, that no LLM SDK is installed, and that every installed
// license is on the allowlist. It also generates NOTICE and the /about data.
//   node scripts/check-register.ts           regenerate the outputs
//   node scripts/check-register.ts --check   CI: fail on any problem or stale output
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import denylist from './llm-denylist.json' with { type: 'json' };

const ROOT = join(import.meta.dirname, '..');
const REGISTER = join(ROOT, 'docs/wiki/open-source-reuse.md');
const NOTICE = join(ROOT, 'NOTICE');
const ATTRIBUTIONS = join(ROOT, 'apps/web/src/generated/attributions.json');
const ASSET_KINDS = ['piece', 'sound'];

type Row = Record<string, string>;
type Table = { heading: string; rows: Row[] };

const cells = (line: string) =>
  line
    .slice(1, -1)
    .split('|')
    .map((c) => c.trim());
const backticked = (text = '') => [...text.matchAll(/`([^`]+)`/g)].map((m) => m[1]!);
const strip = (text = '') => text.replace(/\*\*/g, '').replace(/`/g, '');
// "Next.js (`next`)" → "Next.js": the backticked npm names are for matching only.
const displayName = (text = '') => strip(text.replace(/\s*\((?:`[^`]+`(?:,\s*)?)+\)/g, ''));
const isUsed = (row: Row) => /^(reused|adapted)/i.test(row.Mode ?? '');

export function parseTables(md: string): Table[] {
  const tables: Table[] = [];
  const lines = md.split('\n');
  let heading = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.startsWith('## ')) heading = line.slice(3).trim();
    if (!line.startsWith('|') || !lines[i + 1]?.startsWith('|---')) continue;
    const header = cells(line);
    const rows: Row[] = [];
    for (i += 2; lines[i]?.startsWith('|'); i++) {
      const values = cells(lines[i]!);
      rows.push(Object.fromEntries(header.map((h, j) => [h, values[j] ?? ''])));
    }
    tables.push({ heading, rows });
  }
  return tables;
}

// npm names in backticks in the Component/Version cells of used rows.
export function registeredPackages(tables: Table[]): string[] {
  return tables.flatMap((t) =>
    t.rows.filter(isUsed).flatMap((r) => [...backticked(r.Component), ...backticked(r.Version)]),
  );
}

export const matches = (name: string, pattern: string) =>
  pattern.endsWith('/*') ? name.startsWith(pattern.slice(0, -1)) : name === pattern;

// SPDX expression: any OR-alternative whose AND-terms are all allowed.
export function licenseAllowed(expr: string, allow: Set<string>): boolean {
  return expr
    .replace(/[()]/g, '')
    .split(/\s+OR\s+/)
    .some((alt) => alt.split(/\s+AND\s+/).every((id) => allow.has(id.trim())));
}

export function licenseAllowlist(md: string): Set<string> {
  const start = md.indexOf('outside the allowlist:');
  const end = md.indexOf('\n     - ', start);
  return new Set(backticked(md.slice(start, end)));
}

function directDeps(): Map<string, string> {
  const dirs = ['.', ...['apps', 'packages'].flatMap((d) => readdirSync(join(ROOT, d)).map((n) => `${d}/${n}`))];
  const deps = new Map<string, string>();
  for (const dir of dirs) {
    const file = join(ROOT, dir, 'package.json');
    if (!existsSync(file)) continue;
    const pkg = JSON.parse(readFileSync(file, 'utf8'));
    for (const [name, version] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
      if (!String(version).startsWith('workspace:')) deps.set(name, `${dir}/package.json`);
    }
  }
  return deps;
}

function assetSets(): string[] {
  return ASSET_KINDS.flatMap((kind) => {
    const dir = join(ROOT, 'apps/web/public/assets', kind);
    return existsSync(dir)
      ? readdirSync(dir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => `${kind}/${d.name}`)
      : [];
  });
}

function installedLicenses(): string[] {
  const out = execFileSync('pnpm', ['-r', 'licenses', 'list', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 << 20,
  });
  return Object.keys(JSON.parse(out));
}

function outputs(tables: Table[]) {
  const byHeading = (h: string) => tables.find((t) => t.heading.startsWith(h))?.rows ?? [];
  const components = [...byHeading('Chess code'), ...byHeading('Platform and tooling')].filter(isUsed).map((r) => ({
    name: displayName(r.Component),
    upstream: r.Upstream || undefined,
    license: strip(r.License),
    mode: strip(r.Mode).split(' · ')[0]!,
  }));
  const datasets = byHeading('Datasets')
    .filter((r) => /^\*\*cleared/.test(r.Status ?? ''))
    .map((r) => ({ name: strip(r.Source), terms: strip(r.Terms), notes: strip(r['Obligations / limits']) }));
  const assets = byHeading('Assets')
    .filter((r) => /^\*\*Allowed, with attribution/.test(r.Status ?? ''))
    .map((r) => ({ name: strip(r.Assets), license: strip(r.License) }));
  const attributions = { components, datasets, assets };

  const notice = [
    'CheckMate',
    'Copyright (C) CheckMate contributors. Licensed under AGPL-3.0-or-later (see LICENSE).',
    'Source: https://github.com/Rathetsu/check-mate',
    '',
    'Generated from docs/wiki/open-source-reuse.md by scripts/check-register.ts. Do not edit.',
    '',
    'Third-party components:',
    ...components.map((c) => `- ${c.name} (${c.license})${c.upstream ? ` https://${c.upstream}` : ''}`),
    '',
    'Datasets:',
    ...datasets.map((d) => `- ${d.name} (${d.terms})`),
    '',
    'Assets requiring attribution:',
    ...assets.map((a) => `- ${a.name} (${a.license})`),
    '',
  ].join('\n');

  return { notice, attributions: `${JSON.stringify(attributions, null, 2)}\n` };
}

function main() {
  const check = process.argv.includes('--check');
  const md = readFileSync(REGISTER, 'utf8');
  const tables = parseTables(md);
  const registered = registeredPackages(tables);
  const problems: string[] = [];

  for (const [name, file] of directDeps()) {
    if (denylist.some((p) => matches(name, p)))
      problems.push(`${name} (${file}) is an LLM SDK: not allowed in this repo (CORE-04)`);
    else if (!registered.some((p) => matches(name, p))) problems.push(`${name} (${file}) has no row in the register`);
  }

  const allowedAssets = new Set(
    tables
      .filter((t) => t.heading.startsWith('Assets'))
      .flatMap((t) => t.rows.filter((r) => /^\*\*Allowed/.test(r.Status ?? '')))
      .flatMap((r) => strip(r.Assets).split(/[\s,;()]+/)),
  );
  for (const set of assetSets()) {
    if (!allowedAssets.has(set.split('/')[1]!))
      problems.push(`asset directory ${set} is not an allowed asset in the register (P1-UI-06)`);
  }

  const allow = licenseAllowlist(md);
  for (const license of installedLicenses()) {
    if (!licenseAllowed(license, allow))
      problems.push(`license "${license}" is installed but not on the register allowlist`);
  }

  const { notice, attributions } = outputs(tables);
  if (check) {
    if (!existsSync(NOTICE) || readFileSync(NOTICE, 'utf8') !== notice)
      problems.push('NOTICE is stale: run `pnpm register:write`');
    if (!existsSync(ATTRIBUTIONS) || readFileSync(ATTRIBUTIONS, 'utf8') !== attributions)
      problems.push('apps/web/src/generated/attributions.json is stale: run `pnpm register:write`');
  } else {
    writeFileSync(NOTICE, notice);
    writeFileSync(ATTRIBUTIONS, attributions);
  }

  if (problems.length) {
    console.error(
      `Register check failed (docs/wiki/open-source-reuse.md):\n${problems.map((p) => `  - ${p}`).join('\n')}`,
    );
    process.exit(1);
  }
  console.info(check ? 'Register check passed.' : 'NOTICE and attributions.json written.');
}

if (import.meta.main) main();
