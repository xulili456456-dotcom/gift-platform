// i18n key alignment check - run before build
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'client', 'src', 'i18n', 'locales');
const LANGUAGES = ['en', 'es', 'ja', 'ms', 'tr', 'it', 'id'];
const EN_FILE = 'en.json';

function allKeys(obj, prefix = '') {
  const keys = [];
  for (const k of Object.keys(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'string') {
      keys.push(full);
    } else if (typeof obj[k] === 'object' && obj[k] !== null) {
      keys.push(...allKeys(obj[k], full));
    }
  }
  return keys;
}

const en = require(path.join(LOCALES_DIR, EN_FILE));
const enKeys = allKeys(en);
const enSet = new Set(enKeys);

console.log(`EN (master): ${enKeys.length} keys\n`);

let hasErrors = false;

for (const lang of LANGUAGES) {
  if (lang === 'en') continue;
  const target = require(path.join(LOCALES_DIR, `${lang}.json`));
  const targetKeys = allKeys(target);
  const targetSet = new Set(targetKeys);

  const missing = enKeys.filter(k => !targetSet.has(k));
  const extra = targetKeys.filter(k => !enSet.has(k));

  if (missing.length > 0) {
    console.error(`✖ ${lang}: MISSING ${missing.length} keys`);
    missing.slice(0, 10).forEach(k => console.error(`    - ${k}`));
    if (missing.length > 10) console.error(`    ... and ${missing.length - 10} more`);
    hasErrors = true;
  }
  if (extra.length > 0) {
    console.error(`✖ ${lang}: EXTRA ${extra.length} keys (not in EN)`);
    extra.slice(0, 10).forEach(k => console.error(`    + ${k}`));
    if (extra.length > 10) console.error(`    ... and ${extra.length - 10} more`);
    hasErrors = true;
  }

  if (missing.length === 0 && extra.length === 0) {
    console.log(`✓ ${lang}: OK (${targetKeys.length} keys)`);
  }
}

if (hasErrors) {
  console.error('\n✖ i18n check FAILED. Run `node _fix_i18n.js` to align keys.');
  process.exit(1);
} else {
  console.log('\n✓ All language files aligned.');
}
