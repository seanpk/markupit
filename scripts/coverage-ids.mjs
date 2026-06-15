#!/usr/bin/env node
// MUST-coverage gate.
//
// The spec (ARCHITECTURE.md "Testing") asks for at least one assertion per MUST
// requirement, with tests referencing requirement IDs so coverage is auditable
// against REQUIREMENTS.md. This script enforces that:
//
//   1. Parse every `XXX-N (MUST)` id out of docs/REQUIREMENTS.md.
//   2. Scan every test title under test/ for `[XXX-N]` tags.
//   3. Fail if any non-exempt MUST has no matching assertion.
//
// EXEMPT lists MUSTs that are intentionally not covered by an automated assertion
// in this release, each with a recorded reason. Keep this list short and honest —
// it is the audit trail for what the test suite does NOT yet guarantee.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const EXEMPT = {
  // Deferred to a later release (proxy URL mode).
  'SRC-3': 'deferred: proxy URL mode',
  'SRC-4': 'deferred: proxy URL mode',
  'SRC-5': 'deferred: proxy URL mode',
  'CLI-3': 'deferred: proxy URL mode (http(s) source)',
  // Verified by process/structure or human inspection, not an in-suite assertion.
  'NFR-6': 'clean-room build is a process guarantee, not a runtime assertion',
  'UX-1': 'subjective: docs/UX-CHECKLIST.md',
  'UX-2': 'subjective: docs/UX-CHECKLIST.md',
  'UX-6': 'subjective: docs/UX-CHECKLIST.md',
};

function collectMustIds(md) {
  const ids = new Map();
  const re = /\b([A-Z]+-\d+)\b[^\n|]*\(MUST\)/g;
  let m;
  while ((m = re.exec(md))) ids.set(m[1], true);
  return [...ids.keys()].sort(byArea);
}

function byArea(a, b) {
  const [aa, an] = a.split('-');
  const [ba, bn] = b.split('-');
  return aa === ba ? Number(an) - Number(bn) : aa.localeCompare(ba);
}

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(test|spec)\.js$/.test(name)) out.push(full);
  }
  return out;
}

function collectTaggedIds(files) {
  const tagged = new Set();
  const re = /\[([A-Z]+-\d+)\]/g;
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    let m;
    while ((m = re.exec(src))) tagged.add(m[1]);
  }
  return tagged;
}

const reqs = readFileSync(join(root, 'docs/REQUIREMENTS.md'), 'utf8');
const musts = collectMustIds(reqs);
const tagged = collectTaggedIds(walk(join(root, 'test')));

const covered = [];
const exempt = [];
const missing = [];
for (const id of musts) {
  if (tagged.has(id)) covered.push(id);
  else if (EXEMPT[id]) exempt.push(id);
  else missing.push(id);
}

console.log(`MUST requirements: ${musts.length}`);
console.log(`  covered by an assertion: ${covered.length}`);
console.log(`  exempt (recorded reason): ${exempt.length}`);
for (const id of exempt) console.log(`    - ${id}: ${EXEMPT[id]}`);

if (missing.length) {
  console.error(`\n✗ ${missing.length} MUST requirement(s) have no [ID]-tagged assertion:`);
  for (const id of missing) console.error(`    - ${id}`);
  console.error(
    '\nAdd a test whose title contains the [ID] tag, or record an exemption in scripts/coverage-ids.mjs.'
  );
  process.exit(1);
}

console.log('\n✓ Every MUST requirement is covered or exempt.');
