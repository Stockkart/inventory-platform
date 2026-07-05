#!/usr/bin/env node
/**
 * Replace @inventory-platform/types tsconfig paths with domain type paths.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Paths relative to inventory-platform/ root. */
const DOMAIN_PATHS = {
  '@inventory-platform/contracts': 'platform/contracts/src/index.ts',
  '@inventory-platform/access': 'platform/access/src/index.ts',
  '@inventory-platform/schema/types': 'platform/schema/src/types/index.ts',
  '@inventory-platform/session/types': 'platform/session/src/model/index.ts',
  '@inventory-platform/shell/types': 'platform/shell/src/model/index.ts',
  '@inventory-platform/user/types': 'core/user/src/model/index.ts',
  '@inventory-platform/product/types': 'core/product/src/model/index.ts',
  '@inventory-platform/analytics/types': 'core/analytics/src/model/index.ts',
  '@inventory-platform/reminders/types': 'core/reminders/src/model/index.ts',
  '@inventory-platform/credit/types': 'core/credit/src/model/index.ts',
  '@inventory-platform/plan/types': 'core/plan/src/model/index.ts',
  '@inventory-platform/pricing/types': 'core/pricing/src/model/index.ts',
  '@inventory-platform/taxation/types': 'core/taxation/src/model/index.ts',
  '@inventory-platform/accounting/types': 'core/accounting/src/model/index.ts',
  '@inventory-platform/plugin-cafe/types': 'plugins/cafe/src/types/index.ts',
};

function rel(fromDir, target) {
  const relPath = path.relative(fromDir, path.join(root, target)).split(path.sep).join('/');
  return relPath.startsWith('.') ? relPath : `./${relPath}`;
}

function walkTsconfigs(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'dist') continue;
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) walkTsconfigs(abs, out);
    else if (ent.name.endsWith('.json') && ent.name.includes('tsconfig')) out.push(abs);
  }
  return out;
}

const REFS_TO_DROP = ['shared/types', 'shared/api'];

for (const file of walkTsconfigs(root)) {
  if (file.includes(`${path.sep}node_modules${path.sep}`)) continue;
  const raw = fs.readFileSync(file, 'utf8');
  if (!raw.includes('@inventory-platform/types') && !raw.includes('shared/types')) continue;

  const json = JSON.parse(raw);
  const fromDir = path.dirname(file);
  const paths = json.compilerOptions?.paths ?? {};

  delete paths['@inventory-platform/types'];
  for (const [key, target] of Object.entries(DOMAIN_PATHS)) {
    paths[key] = [rel(fromDir, target)];
  }
  if (json.compilerOptions) json.compilerOptions.paths = paths;

  if (Array.isArray(json.references)) {
    json.references = json.references.filter((ref) => {
      const p = ref.path ?? '';
      return !REFS_TO_DROP.some((drop) => p.includes(drop));
    });
    const contractsRef = rel(fromDir, 'platform/contracts/tsconfig.lib.json');
    if (
      !json.references.some((r) => r.path?.includes('contracts')) &&
      file.includes('tsconfig.lib')
    ) {
      json.references.push({ path: contractsRef });
    }
  }

  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
  console.log('updated', path.relative(root, file));
}

// Root tsconfig: keep shared/types reference for shim build until Phase G delete
const rootTs = path.join(root, 'tsconfig.json');
const rootJson = JSON.parse(fs.readFileSync(rootTs, 'utf8'));
rootJson.references = rootJson.references.filter(
  (ref) => !ref.path?.includes('shared/api')
);
fs.writeFileSync(rootTs, JSON.stringify(rootJson, null, 2) + '\n');
console.log('updated tsconfig.json (dropped shared/api ref)');
