#!/usr/bin/env node
// Bumps the plugin version in every file that holds it and keeps them in sync.
// Usage: node .github/scripts/bump-version.mjs [patch|minor|major]   (default: patch)
// Prints the new version on stdout.
import { readFileSync, writeFileSync } from 'node:fs';

const level = (process.argv[2] || 'patch').toLowerCase();
if (!['patch', 'minor', 'major'].includes(level)) {
  console.error(`unknown bump level: ${level}`);
  process.exit(1);
}

const PLUGIN = 'plugin/.claude-plugin/plugin.json';
const MARKET = '.claude-plugin/marketplace.json';

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const parse = (v) => {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v || '').trim());
  if (!m) throw new Error(`not a semver x.y.z version: ${v}`);
  return m.slice(1).map(Number);
};
const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

const plugin = read(PLUGIN);
const market = read(MARKET);
const entry = market.plugins.find((p) => p.name === plugin.name);
if (!entry) throw new Error(`${MARKET} has no plugin named ${plugin.name}`);

// If the two files disagree (e.g. a PR edited one by hand), start from the higher.
const versions = [plugin.version, entry.version].filter(Boolean).map(parse);
let [maj, min, pat] = versions.sort(cmp).at(-1);
if (level === 'major') [maj, min, pat] = [maj + 1, 0, 0];
else if (level === 'minor') [min, pat] = [min + 1, 0];
else pat += 1;
const next = `${maj}.${min}.${pat}`;

// Replace only the version string so the files keep their formatting.
const setVersion = (path, from) => {
  const src = readFileSync(path, 'utf8');
  const re = new RegExp(`("version"\\s*:\\s*")${from.replace(/\./g, '\\.')}(")`);
  if (!re.test(src)) throw new Error(`version ${from} not found in ${path}`);
  writeFileSync(path, src.replace(re, `$1${next}$2`));
};
setVersion(PLUGIN, plugin.version);
setVersion(MARKET, entry.version);

console.log(next);
