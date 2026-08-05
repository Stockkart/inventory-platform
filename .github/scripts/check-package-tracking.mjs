#!/usr/bin/env node
/**
 * Ensures every workspace package under core/, platform/, and plugins/ is
 * tracked in PR tooling (labels, labeler, CODEOWNERS) and ESLint app bans.
 *
 * Run: node .github/scripts/check-package-tracking.mjs
 * Wired by: .github/workflows/package-tracking.yml
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

/** Core packages composed only as scaffolds — not banned from apps/inventory. */
const CORE_ESLINT_BAN_EXEMPT = new Set(['checkout', 'notifications']);

/** Plugin packages that apps may import (route composer). */
const PLUGIN_ESLINT_BAN_EXEMPT = new Set(['registry']);

function read(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function listPackageDirs(layer) {
  const base = join(ROOT, layer);
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => existsSync(join(base, name, 'package.json')))
    .sort();
}

function packageName(layer, dir) {
  const pkg = JSON.parse(readFileSync(join(ROOT, layer, dir, 'package.json'), 'utf8'));
  return pkg.name;
}

function moduleLabel(layer, dir) {
  if (layer === 'plugins') return `module:plugin-${dir}`;
  return `module:${dir}`;
}

function pathGlob(layer, dir) {
  return `${layer}/${dir}/**`;
}

function codeownersPath(layer, dir) {
  return `/${layer}/${dir}/`;
}

function expectEslintBan(layer, dir) {
  if (layer === 'core') return !CORE_ESLINT_BAN_EXEMPT.has(dir);
  if (layer === 'plugins') return !PLUGIN_ESLINT_BAN_EXEMPT.has(dir);
  return false;
}

function hasLabelDefinition(labelsYml, label) {
  // Match "- name: module:foo" as its own entry
  const re = new RegExp(`^-\\s*name:\\s*['"]?${label.replace(/:/g, '\\:')}['"]?\\s*$`, 'm');
  return re.test(labelsYml);
}

function hasLabelerEntry(labelerYml, label, glob) {
  if (!labelerYml.includes(`'${label}':`) && !labelerYml.includes(`"${label}":`)) {
    return false;
  }
  // Ensure the path glob appears somewhere near the label (same file is enough;
  // we also require the exact glob string).
  return labelerYml.includes(`'${glob}'`) || labelerYml.includes(`"${glob}"`);
}

function hasCodeownersEntry(codeowners, pathPrefix) {
  return codeowners.split(/\r?\n/).some((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return false;
    return trimmed.startsWith(pathPrefix);
  });
}

function hasRootTsconfigRef(tsconfig, layer, dir) {
  const needle = `"./${layer}/${dir}"`;
  return tsconfig.includes(needle);
}

function hasPackageEslintConfig(layer, dir) {
  return existsSync(join(ROOT, layer, dir, 'eslint.config.mjs'));
}

function main() {
  const labelsYml = read('.github/labels.yml');
  const labelerYml = read('.github/labeler.yml');
  const codeowners = read('.github/CODEOWNERS');
  const eslintConfig = read('eslint.config.mjs');
  const rootTsconfig = read('tsconfig.json');

  const errors = [];
  const warnings = [];

  const layers = ['core', 'platform', 'plugins'];

  for (const layer of layers) {
    for (const dir of listPackageDirs(layer)) {
      const label = moduleLabel(layer, dir);
      const glob = pathGlob(layer, dir);
      const ownersPath = codeownersPath(layer, dir);
      const npmName = packageName(layer, dir);

      if (!hasLabelDefinition(labelsYml, label)) {
        errors.push(
          `Missing label definition for ${npmName}: add \`${label}\` to .github/labels.yml`,
        );
      }

      if (!hasLabelerEntry(labelerYml, label, glob)) {
        errors.push(
          `Missing labeler mapping for ${npmName}: add '${label}' → '${glob}' in .github/labeler.yml`,
        );
      }

      if (!hasCodeownersEntry(codeowners, ownersPath)) {
        errors.push(
          `Missing CODEOWNERS entry for ${npmName}: add \`${ownersPath}\` to .github/CODEOWNERS`,
        );
      }

      if (!hasPackageEslintConfig(layer, dir)) {
        errors.push(
          `Missing package ESLint config for ${npmName}: add ${layer}/${dir}/eslint.config.mjs`,
        );
      }

      if (!hasRootTsconfigRef(rootTsconfig, layer, dir)) {
        warnings.push(
          `Root tsconfig.json has no project reference for ./${layer}/${dir} (${npmName})`,
        );
      }

      if (expectEslintBan(layer, dir)) {
        // Look for the package name as a string in the apps/inventory ban list.
        const quoted = `'${npmName}'`;
        const quotedAlt = `"${npmName}"`;
        if (!eslintConfig.includes(quoted) && !eslintConfig.includes(quotedAlt)) {
          errors.push(
            `Missing apps/inventory import ban for ${npmName}: add it to the no-restricted-imports group in eslint.config.mjs`,
          );
        }
      }
    }
  }

  if (warnings.length) {
    console.log('Warnings:\n');
    for (const w of warnings) console.log(`  ⚠  ${w}`);
    console.log('');
  }

  if (errors.length) {
    console.error('Package tracking check failed:\n');
    for (const e of errors) console.error(`  ✖  ${e}`);
    console.error(`
When creating a new package, update:
  - .github/labels.yml
  - .github/labeler.yml
  - .github/CODEOWNERS
  - eslint.config.mjs (apps/inventory domain import ban, if applicable)
  - <package>/eslint.config.mjs
  - tsconfig.json (project reference)
  - AGENTS.md domain table / Cursor architecture rule

See AGENTS.md → "New package checklist".
`);
    process.exit(1);
  }

  console.log('Package tracking OK — all core/platform/plugins packages are wired.');
}

main();
