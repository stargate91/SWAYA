import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load all localization JSON files
const localesDir = path.resolve(__dirname, '../src/app/locales/en');
const localesFixDir = path.resolve(__dirname, '../src/app/locales-fix/en');
const localesCache = {};

function mergeDeep(target, source) {
  const output = { ...target };
  if (target && typeof target === 'object' && source && typeof source === 'object') {
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object') {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = mergeDeep(target[key], source[key]);
        }
      } else {
        output[key] = source[key];
      }
    });
  }
  return output;
}

const loadDir = (dir) => {
  try {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(dir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const parsed = JSON.parse(content);
          const name = path.basename(file, '.json');
          if (localesCache[name]) {
            localesCache[name] = mergeDeep(localesCache[name], parsed);
          } else {
            localesCache[name] = parsed;
          }
        }
      }
    }
  } catch (e) {
    console.error(`Failed to load translations from ${dir} for ESLint rule:`, e);
  }
};

loadDir(localesDir);
loadDir(localesFixDir);

// Reconstruct the translation tree exactly as LanguageProvider.jsx does
const translationTree = {
  ...(localesCache['common'] || {}),
  about: localesCache['about'] || {},
  dashboard: localesCache['dashboard'] || {},
  settingsPage: localesCache['settings'] || {},
  organizer: localesCache['organizer'] || {},
  library: localesCache['library'] || {},
  historyPage: localesCache['history'] || {},
  onboarding: localesCache['onboarding'] || {},
  ratings: localesCache['ratings'] || {},
  lists: localesCache['lists'] || {},
  search: localesCache['search'] || {},
  statistics: localesCache['statistics'] || {},
};

// Helper to check if a nested key exists
function hasKey(obj, pathArray) {
  let current = obj;
  for (const key of pathArray) {
    if (current === null || typeof current !== 'object' || !(key in current)) {
      return false;
    }
    current = current[key];
  }
  return true;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure translation keys used in t() or T() exist in the locale JSON files.',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        // Match t('key') or T('key')
        if (
          node.callee.type === 'Identifier' &&
          (node.callee.name === 't' || node.callee.name === 'T') &&
          node.arguments.length > 0
        ) {
          const firstArg = node.arguments[0];
          if (firstArg.type === 'Literal' && typeof firstArg.value === 'string') {
            const keyPath = firstArg.value;
            const parts = keyPath.split('.');

            if (!hasKey(translationTree, parts)) {
              context.report({
                node,
                message: `Translation key "${keyPath}" is missing in localization files.`,
              });
            }
          }
        }
      },
    };
  },
};
