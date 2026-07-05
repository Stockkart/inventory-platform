#!/usr/bin/env node
/**
 * Replace @inventory-platform/types in package.json with @inventory-platform/contracts
 * (domain type packages are resolved via tsconfig paths; contracts is the shared kernel).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PACKAGE_DIRS = [
  'core/accounting',
  'core/analytics',
  'core/credit',
  'core/plan',
  'core/pricing',
  'core/product',
  'core/reminders',
  'core/taxation',
  'core/user',
  'platform/routing',
  'platform/schema',
  'platform/shell',
  'plugins/cafe',
  'features/onboarding',
  'features/auth',
];

for (const dir of PACKAGE_DIRS) {
  const pkgPath = path.join(root, dir, 'package.json');
  if (!fs.existsSync(pkgPath)) continue;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const deps = pkg.dependencies ?? {};
  if (!deps['@inventory-platform/types']) continue;

  delete deps['@inventory-platform/types'];
  if (!deps['@inventory-platform/contracts']) {
    deps['@inventory-platform/contracts'] = 'workspace:*';
  }
  pkg.dependencies = deps;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('updated', dir);
}
