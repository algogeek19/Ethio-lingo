#!/usr/bin/env node
/**
 * UI regression guards for defects that oxlint and vite both accept silently.
 *
 * Both of these reached main while `npm run lint` and `npm run build` were
 * green, because each is valid JavaScript that merely renders wrong:
 *
 *   1. A quoted JSX expression container — "{c('dashboard.openLesson')}" — is a
 *      string that renders as literal text on the page.
 *
 *   2. A component calling advanceToNextDay(). Advancing the module day is the
 *      server's decision (syncLearnerModuleDay) and is gated on the 24h window
 *      closing. The countdown widget used to call it unconditionally: first on
 *      every 1s tick after midnight, then — once that was fixed — on mount
 *      whenever the localStorage mirror said all tasks were done, which advanced
 *      the day on a plain page reload. TestProgressWidget is the only legitimate
 *      caller, since it is an explicit developer simulation.
 */
import fs from 'fs';
import path from 'path';

/** Components allowed to advance the day by hand. */
const DAY_ADVANCE_ALLOWLIST = new Set(['src/components/common/TestProgressWidget.jsx']);

/** Files that legitimately contain an expression inside a quoted attribute. */
const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) out.push(p);
  }
  return out;
};

let failures = 0;

const fail = (file, lineNo, message, line) => {
  console.log(`${file}:${lineNo}  ${message}`);
  console.log(`    ${String(line).trim().slice(0, 110)}`);
  failures += 1;
};

/* ------------------------------------------- rule 1: quoted JSX expressions */

const scanQuotedExpressions = (file, source) => {
  source.split('\n').forEach((line, i) => {
    let quote = null;
    let start = 0;
    for (let k = 0; k < line.length; k += 1) {
      const ch = line[k];
      if (quote) {
        if (ch === '\\') {
          k += 1;
          continue;
        }
        if (ch === quote) {
          if (/\{\s*(c|t)\s*\(/.test(line.slice(start, k))) {
            fail(file, i + 1, 'expression wrapped in quotes — renders as literal text', line);
          }
          quote = null;
        }
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') {
        quote = ch;
        start = k + 1;
      }
    }
  });
};

/* ------------------------------------- rule 2: client-side day advancement */

const scanDayAdvance = (file, source) => {
  if (DAY_ADVANCE_ALLOWLIST.has(file.split(path.sep).join('/'))) return;
  source.split('\n').forEach((line, i) => {
    // Ignore the explanatory comment that documents why this is forbidden.
    const trimmed = line.trim();
    if (trimmed.startsWith('*') || trimmed.startsWith('//')) return;
    if (!/\badvanceToNextDay\s*\(/.test(line)) return;
    if (/\bconst\b.*=\s*useStaking\b/.test(line)) return; // destructuring is fine
    if (/^\s*\w+,\s*$/.test(line)) return; // bare destructured name
    fail(
      file,
      i + 1,
      'calls advanceToNextDay() — the server owns day progression (24h window)',
      line
    );
  });
};

const roots = process.argv.slice(2);
const files = roots.flatMap((r) => (fs.statSync(r).isDirectory() ? walk(r) : [r]));

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  // Block comments are stripped so documented references do not trip the rules.
  const scannable = source.replace(/\/\*[\s\S]*?\*\//g, '');
  scanQuotedExpressions(file, scannable);
  scanDayAdvance(file, scannable);
}

if (failures) {
  console.log(`\n${failures} UI regression(s) found.`);
  process.exit(1);
}
console.log('clean: no quoted expressions and no client-side day advancement.');
