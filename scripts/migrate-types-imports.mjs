#!/usr/bin/env node
/**
 * Migrate imports from @inventory-platform/types to domain type packages.
 * Run: node scripts/migrate-types-imports.mjs [--check] [glob-root...]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const extraRoots = process.argv.slice(2).filter((a) => !a.startsWith('--'));

/** @type {Array<{ importPath: string; files: string[]; priority: number }>} */
const SOURCES = [
  {
    importPath: '@inventory-platform/contracts',
    priority: 10,
    files: ['platform/contracts/src/index.ts'],
  },
  {
    importPath: '@inventory-platform/access',
    priority: 20,
    files: [
      'platform/access/src/shop-capabilities.ts',
      'platform/access/src/shop-access.ts',
      'platform/access/src/product-search-fields.ts',
    ],
  },
  {
    importPath: '@inventory-platform/schema/types',
    priority: 30,
    files: ['platform/schema/src/types/vertical-schema.ts'],
  },
  {
    importPath: '@inventory-platform/session/types',
    priority: 40,
    files: ['platform/session/src/model/auth.types.ts', 'platform/session/src/model/index.ts'],
  },
  {
    importPath: '@inventory-platform/shell/types',
    priority: 50,
    files: ['platform/shell/src/model/types.ts', 'platform/shell/src/model/index.ts'],
  },
  {
    importPath: '@inventory-platform/user/types',
    priority: 60,
    files: ['core/user/src/model/shop.types.ts', 'core/user/src/model/party.types.ts'],
  },
  {
    importPath: '@inventory-platform/product/types',
    priority: 70,
    files: [
      'core/product/src/model/types.ts',
      'core/product/src/model/sellable-ref.ts',
      'core/product/src/model/store.types.ts',
    ],
  },
  {
    importPath: '@inventory-platform/analytics/types',
    priority: 80,
    files: ['core/analytics/src/model/types.ts'],
  },
  {
    importPath: '@inventory-platform/reminders/types',
    priority: 90,
    files: ['core/reminders/src/model/types.ts'],
  },
  {
    importPath: '@inventory-platform/credit/types',
    priority: 100,
    files: ['core/credit/src/model/types.ts'],
  },
  {
    importPath: '@inventory-platform/plan/types',
    priority: 110,
    files: ['core/plan/src/model/types.ts', 'core/plan/src/guards/planExpiry.ts'],
  },
  {
    importPath: '@inventory-platform/pricing/types',
    priority: 120,
    files: ['core/pricing/src/model/types.ts'],
  },
  {
    importPath: '@inventory-platform/taxation/types',
    priority: 130,
    files: ['core/taxation/src/model/types.ts'],
  },
  {
    importPath: '@inventory-platform/accounting/types',
    priority: 140,
    files: ['core/accounting/src/model/types.ts'],
  },
  {
    importPath: '@inventory-platform/plugin-cafe/types',
    priority: 150,
    files: ['plugins/cafe/src/types/menu.ts'],
  },
  {
    importPath: '@inventory-platform/product/types',
    priority: 200,
    files: ['core/product/src/model/legacy.types.ts'],
  },
];

/** @type {Map<string, { importPath: string; priority: number }>} */
const symbolMap = new Map();

const EXPORT_RE =
  /^export (?:type )?(?:interface|type|const|function|enum) ([A-Za-z0-9_]+)/;

for (const source of SOURCES) {
  for (const rel of source.files) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, 'utf8');
    for (const line of text.split('\n')) {
      const m = line.match(EXPORT_RE);
      if (!m) continue;
      const name = m[1];
      const existing = symbolMap.get(name);
      if (!existing || source.priority < existing.priority) {
        symbolMap.set(name, {
          importPath: source.importPath,
          priority: source.priority,
        });
      }
    }
  }
}

const IMPORT_RE =
  /^import\s+(type\s+)?(\{([^}]+)\}|([A-Za-z0-9_]+))\s+from\s+['"]@inventory-platform\/types['"];?\s*$/gm;

function splitSpecifiers(raw) {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const aliasMatch = part.match(/^([A-Za-z0-9_]+)\s+as\s+([A-Za-z0-9_]+)$/);
      if (aliasMatch) {
        return { name: aliasMatch[1], alias: aliasMatch[2], typeOnly: false };
      }
      const typePrefix = part.match(/^type\s+([A-Za-z0-9_]+)$/);
      if (typePrefix) {
        return { name: typePrefix[1], alias: null, typeOnly: true };
      }
      return { name: part, alias: null, typeOnly: false };
    });
}

function migrateContent(content, filePath) {
  let changed = false;
  const unknown = new Set();

  const next = content.replace(IMPORT_RE, (full, typeKw, _group, namedInner, defaultName) => {
    changed = true;
    if (defaultName) {
      const hit = symbolMap.get(defaultName);
      if (!hit) {
        unknown.add(defaultName);
        return full;
      }
      return `import ${typeKw ?? ''}${defaultName} from '${hit.importPath}';`;
    }

    const specs = splitSpecifiers(namedInner);
    /** @type {Map<string, Array<{ name: string; alias: string | null; typeOnly: boolean }>>} */
    const byPath = new Map();

    for (const spec of specs) {
      const hit = symbolMap.get(spec.name);
      if (!hit) {
        unknown.add(spec.name);
        byPath.set('@inventory-platform/types', [
          ...(byPath.get('@inventory-platform/types') ?? []),
          spec,
        ]);
        continue;
      }
      byPath.set(hit.importPath, [...(byPath.get(hit.importPath) ?? []), spec]);
    }

    const lines = [];
    for (const [importPath, items] of byPath) {
      const parts = items.map((item) => {
        if (item.typeOnly) return `type ${item.name}`;
        if (item.alias) return `${item.name} as ${item.alias}`;
        return item.name;
      });
      const allTypes = items.every((i) => i.typeOnly);
      const typePrefix = typeKw || (allTypes ? 'type ' : '');
      lines.push(`import ${typePrefix}{ ${parts.join(', ')} } from '${importPath}';`);
    }
    return lines.join('\n');
  });

  if (unknown.size) {
    console.warn(`WARN ${filePath}: unmapped symbols: ${[...unknown].join(', ')}`);
  }

  return { content: next, changed: changed && next !== content };
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name === 'build') continue;
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(abs, out);
    else if (/\.(ts|tsx)$/.test(ent.name)) out.push(abs);
  }
  return out;
}

const scanRoots =
  extraRoots.length > 0
    ? extraRoots.map((r) => path.resolve(root, r))
    : [
        path.join(root, 'core'),
        path.join(root, 'platform'),
        path.join(root, 'plugins'),
        path.join(root, 'features'),
        path.join(root, 'apps'),
        path.join(root, 'ui-kit'),
      ];

let fileCount = 0;
let changeCount = 0;

for (const scanRoot of scanRoots) {
  if (!fs.existsSync(scanRoot)) continue;
  for (const file of walk(scanRoot)) {
    if (file.includes(`${path.sep}shared${path.sep}types${path.sep}`)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (!text.includes("@inventory-platform/types")) continue;
    fileCount++;
    const { content, changed } = migrateContent(text, path.relative(root, file));
    if (changed) {
      changeCount++;
      if (!checkOnly) fs.writeFileSync(file, content);
      console.log(checkOnly ? 'would migrate' : 'migrated', path.relative(root, file));
    }
  }
}

console.log(
  `${checkOnly ? 'Check' : 'Done'}: ${changeCount}/${fileCount} files with @inventory-platform/types imports`
);
