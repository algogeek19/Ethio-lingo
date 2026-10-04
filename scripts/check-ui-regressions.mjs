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

/**
 * Magic escrow figures. A balance must come from the API; hardcoding one (as an
 * initial state or as an `|| 900` fallback) invents money that does not exist.
 * `|| 900` is the worse of the two: a real balance of exactly 0 is falsy, so a
 * fully-slashed learner was shown a 900 ETB vault and could request a withdrawal
 * for 900 ETB they had never staked.
 */
const MAGIC_BALANCE_RE = /(?<![0-9a-zA-Z_])(900|1000)(?:\.0)?(?=\s*\)|\s*[,;}]|:\s*900)/;
const BALANCE_FALLBACK_RE = /stakedAmount[^;\n]*\|\|\s*(?:900|1000)|(?:900|1000)(?:\.0)?\s*;?\s*$/;

/** Files where a literal stake amount is legitimate configuration. */
const MAGIC_BALANCE_ALLOWLIST = new Set([
  'server/prisma/seed.js',
  // Manual developer walkthrough script that asserts against fixture amounts.
  'server/src/utils/test_backend_flow.js',
  'src/features/admin/SiteContentPage.jsx',
  'src/content/catalog.js',
]);

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

/* -------------------------------- rule 3: invented escrow balance figures */

const scanMagicBalance = (file, source) => {
  const rel = file.split(path.sep).join('/');
  if (MAGIC_BALANCE_ALLOWLIST.has(rel)) return;
  // File-level context, not per-line. The bug appeared as a bare
  // `return x ? x : 900.0` on a line that never mentions "stakedAmount", so a
  // line-scoped rule kept missing it.
  const handlesBalances = /(stakedAmount|stakedBalance|withdrawAmount|netStake|availableStake)/.test(source);

  source.split('\n').forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('*') || trimmed.startsWith('//')) return;
    if (!handlesBalances) return;

    // 900 is the figure that was hardcoded as a state initialiser, a display
    // `|| 900` default, and a server-side payout fallback. In a file that handles
    // balances it is never legitimate. Deliberately blunt — the allowlist above
    // is where exceptions belong.
    // The leading `-` exclusion keeps Tailwind's `stone-900/60` out of this.
    if (/(?<![0-9a-zA-Z_.\-/])900(\.0)?(?![0-9a-zA-Z_])/.test(line)) {
      fail(file, i + 1, 'hardcoded 900 in a balance-handling file — balances must come from the API', line);
    }
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
  scanMagicBalance(file, scannable);
}

if (failures) {
  console.log(`\n${failures} UI regression(s) found.`);
  process.exit(1);
}
console.log('clean: no quoted expressions, no client-side day advancement, no magic balances.');
