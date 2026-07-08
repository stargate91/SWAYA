#!/usr/bin/env node

/**
 * i18n Dead Key Audit Script
 * 
 * Scans all translation JSON files under locales/en/ and checks
 * whether each flattened key appears anywhere in the JSX/JS source files.
 * 
 * Usage:
 *   node frontend/scripts/audit-i18n.mjs
 *   node frontend/scripts/audit-i18n.mjs --verbose
 *   node frontend/scripts/audit-i18n.mjs --json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_ROOT = path.resolve(__dirname, '..');
const LOCALES_DIR = path.join(FRONTEND_ROOT, 'src', 'app', 'locales', 'en');
const SRC_DIR = path.join(FRONTEND_ROOT, 'src');

const flags = process.argv.slice(2);
const VERBOSE = flags.includes('--verbose') || flags.includes('-v');
const JSON_OUTPUT = flags.includes('--json');

// ─── Colors ──────────────────────────────────────────────────────────
const c = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  magenta: (s) => `\x1b[35m${s}\x1b[0m`,
};

// ─── Flatten nested JSON into dot-notation keys ──────────────────────
function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// ─── Build the full translation key map ──────────────────────────────
// Mirrors LanguageProvider.jsx merge logic:
//   common.json  → spread at root     → t('common.back')
//   library.json → under "library"    → t('library.tabs.movies')
//   settings.json→ under "settingsPage"→ t('settingsPage.general.title')

const NAMESPACE_MAP = {
  'common.json': null,           // spread at root
  'dashboard.json': 'dashboard',
  'settings.json': 'settingsPage',
  'organizer.json': 'organizer',
  'library.json': 'library',
  'history.json': 'historyPage',
  'onboarding.json': 'onboarding',
  'ratings.json': 'ratings',
  'lists.json': 'lists',
  'search.json': 'search',
  'about.json': 'about',
  'statistics.json': 'statistics',
};

function loadAllKeys() {
  const allKeys = [];
  const files = fs.readdirSync(LOCALES_DIR).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(LOCALES_DIR, file);
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const namespace = NAMESPACE_MAP[file];
    const flat = flattenKeys(json);

    for (const key of flat) {
      let fullKey;
      if (namespace === null) {
        fullKey = key;
      } else if (key.startsWith(namespace + '.') || key.startsWith(namespace + '_')) {
        fullKey = key;
      } else {
        fullKey = `${namespace}.${key}`;
      }

      allKeys.push({
        key: fullKey,
        file,
        filePath,
      });
    }
  }

  return allKeys;
}

// ─── Recursively collect all source files ────────────────────────────
const EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);

function collectSourceFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // skip node_modules, locales (don't match keys inside their own JSON)
      if (entry.name === 'node_modules' || entry.name === 'locales') continue;
      results.push(...collectSourceFiles(fullPath));
    } else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

// ─── Load all source content into memory for fast searching ──────────
function loadSourceContent(srcDir) {
  const files = collectSourceFiles(srcDir);
  const contents = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf-8');
    contents.push({ file, text });
  }
  return contents;
}

// ─── Search for a key in loaded source files ─────────────────────────
function searchKey(key, sourceFiles) {
  const hits = [];
  for (const { file, text } of sourceFiles) {
    // Count occurrences of the key as a literal substring
    let idx = 0;
    let count = 0;
    while ((idx = text.indexOf(key, idx)) !== -1) {
      count++;
      idx += key.length;
    }
    if (count > 0) {
      hits.push({ file: path.relative(SRC_DIR, file), count });
    }
  }
  return hits;
}

// ─── Detect potentially dynamic keys ─────────────────────────────────
function isDynamicCandidate(key, sourceFiles) {
  const parts = key.split('.');
  if (parts.length < 2) return false;
  const parentKey = parts.slice(0, -1).join('.');
  // Check if parent prefix + '.' appears with a template literal pattern
  // e.g. `library.empty.${var}`
  const searchStr = parentKey + '.';
  for (const { text } of sourceFiles) {
    if (text.includes(searchStr)) {
      return true;
    }
  }
  return false;
}

// ─── Main ────────────────────────────────────────────────────────────
function main() {
  if (!JSON_OUTPUT) {
    console.log('');
    console.log(c.bold('  ╭─────────────────────────────────────────────╮'));
    console.log(c.bold('  │') + c.cyan('        i18n Dead Key Audit Report          ') + c.bold('│'));
    console.log(c.bold('  ╰─────────────────────────────────────────────╯'));
    console.log('');
  }

  const allKeys = loadAllKeys();

  if (!JSON_OUTPUT) {
    console.log(c.dim(`  Loading source files...`));
  }
  const sourceFiles = loadSourceContent(SRC_DIR);
  if (!JSON_OUTPUT) {
    console.log(c.dim(`  Loaded ${sourceFiles.length} source files.`));
    console.log(c.dim(`  Scanning ${allKeys.length} translation keys...`));
    console.log('');
  }

  const unused = [];
  const dynamic = [];
  const used = [];

  for (let i = 0; i < allKeys.length; i++) {
    const entry = allKeys[i];
    const hits = searchKey(entry.key, sourceFiles);

    if (!JSON_OUTPUT && (i + 1) % 100 === 0) {
      process.stdout.write(c.dim(`\r  Progress: ${i + 1}/${allKeys.length}`));
    }

    if (hits.length === 0) {
      const maybeDynamic = isDynamicCandidate(entry.key, sourceFiles);
      if (maybeDynamic) {
        dynamic.push(entry);
      } else {
        unused.push(entry);
      }
    } else {
      entry.hits = hits.reduce((sum, h) => sum + h.count, 0);
      entry.hitFiles = hits;
      used.push(entry);
    }
  }

  if (!JSON_OUTPUT) {
    process.stdout.write('\r                                        \r');
  }

  // ─── JSON output mode ──────────────────────────────────────────────
  if (JSON_OUTPUT) {
    console.log(JSON.stringify({
      total: allKeys.length,
      used: used.length,
      unused: unused.map((e) => ({ key: e.key, file: e.file })),
      dynamic: dynamic.map((e) => ({ key: e.key, file: e.file })),
    }, null, 2));
    return;
  }

  // ─── Unused keys ───────────────────────────────────────────────────
  if (unused.length > 0) {
    const grouped = {};
    for (const entry of unused) {
      if (!grouped[entry.file]) grouped[entry.file] = [];
      grouped[entry.file].push(entry.key);
    }

    console.log(c.red(c.bold(`  ✖ UNUSED KEYS (${unused.length})`)));
    console.log(c.dim('  ─────────────────────────────────────────────'));
    console.log(c.dim('  These keys exist in locale JSON but are never'));
    console.log(c.dim('  referenced in any .js/.jsx source file.'));
    console.log('');

    for (const [file, keys] of Object.entries(grouped)) {
      console.log(`  ${c.cyan(file)}`);
      for (const key of keys) {
        console.log(`    ${c.red('✖')}  ${key}`);
      }
      console.log('');
    }
  }

  // ─── Dynamic candidates ────────────────────────────────────────────
  if (dynamic.length > 0) {
    const grouped = {};
    for (const entry of dynamic) {
      if (!grouped[entry.file]) grouped[entry.file] = [];
      grouped[entry.file].push(entry.key);
    }

    console.log(c.yellow(c.bold(`  ⚠ POSSIBLY DYNAMIC (${dynamic.length})`)));
    console.log(c.dim('  ─────────────────────────────────────────────'));
    console.log(c.dim('  These keys are not found literally, but their'));
    console.log(c.dim('  parent prefix IS used — likely built via'));
    console.log(c.dim('  template literals like t(`prefix.${var}`).'));
    console.log(c.dim('  Review manually before removing.'));
    console.log('');

    for (const [file, keys] of Object.entries(grouped)) {
      console.log(`  ${c.cyan(file)}`);
      for (const key of keys) {
        console.log(`    ${c.yellow('⚠')}  ${key}`);
      }
      console.log('');
    }
  }

  // ─── Summary ───────────────────────────────────────────────────────
  console.log(c.bold('  ╭─────────────────────────────────────────────╮'));
  console.log(c.bold('  │') + '  Summary                                   ' + c.bold('│'));
  console.log(c.bold('  ├─────────────────────────────────────────────┤'));
  console.log(c.bold('  │') + `  Total keys:       ${String(allKeys.length).padStart(6)}                  ` + c.bold('│'));
  console.log(c.bold('  │') + `  ${c.green('Used:  ')}            ${c.green(String(used.length).padStart(6))}                  ` + c.bold('│'));
  console.log(c.bold('  │') + `  ${c.red('Unused:')}            ${c.red(String(unused.length).padStart(6))}                  ` + c.bold('│'));
  console.log(c.bold('  │') + `  ${c.yellow('Dynamic (review):')} ${c.yellow(String(dynamic.length).padStart(6))}                  ` + c.bold('│'));
  console.log(c.bold('  ╰─────────────────────────────────────────────╯'));
  console.log('');

  if (unused.length === 0 && dynamic.length === 0) {
    console.log(c.green('  ✔ All translation keys are in use. Clean! 🎉'));
  } else if (unused.length > 0) {
    console.log(c.dim(`  Run with ${c.cyan('--json')} flag for machine-readable output.`));
    console.log(c.dim(`  Run with ${c.cyan('--verbose')} flag for hit counts on used keys.`));
  }

  // ─── Verbose: show used keys with hit counts ───────────────────────
  if (VERBOSE && used.length > 0) {
    console.log('');
    console.log(c.green(c.bold(`  ✔ USED KEYS (${used.length})`)));
    console.log(c.dim('  ─────────────────────────────────────────────'));

    const groupedUsed = {};
    for (const entry of used) {
      if (!groupedUsed[entry.file]) groupedUsed[entry.file] = [];
      groupedUsed[entry.file].push(entry);
    }

    for (const [file, entries] of Object.entries(groupedUsed)) {
      console.log(`  ${c.cyan(file)}`);
      for (const entry of entries) {
        const fileList = entry.hitFiles.map((h) => `${h.file}(${h.count})`).join(', ');
        console.log(`    ${c.green('✔')}  ${entry.key}  ${c.dim(`→ ${fileList}`)}`);
      }
      console.log('');
    }
  }

  console.log('');
}

main();
