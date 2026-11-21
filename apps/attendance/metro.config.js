/**
 * Metro config for an Expo app inside the pnpm workspace (Expo docs, "Work with monorepos").
 *
 * `expo/metro-config` already detects the pnpm workspace: its defaults watch the root
 * `node_modules` and every workspace package, and resolve from the app's `node_modules` (symlinks
 * into `<root>/node_modules/.pnpm`) and the workspace root `node_modules`. The two settings below
 * are kept explicit and *added to* the defaults (never replaced, which `expo-doctor` flags):
 *
 * - `watchFolders` gains the workspace root itself, so files outside a package (for example
 *   `platform/attendance-protocol/fixtures`) and `node_modules/.pnpm` are watched too.
 * - `nodeModulesPaths` lists the app and root `node_modules`, in that order.
 *
 * Hierarchical lookup stays on: pnpm's isolated layout resolves a package's own dependencies from
 * the real path next to it, which needs the walk up the directory tree.
 */
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

const unique = (paths) => Array.from(new Set(paths));

config.watchFolders = unique([...(config.watchFolders ?? []), workspaceRoot]);
config.resolver.nodeModulesPaths = unique([
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
  ...(config.resolver.nodeModulesPaths ?? []),
]);

// Workspace TypeScript sources import siblings with the `.js` extension that `tsc` will emit
// (`import … from './canonical.js'` in `platform/attendance-protocol/src`). Metro resolves those
// packages from source (`exports["."].default` → `src/index.ts`) and does not map `.js` to `.ts`,
// so when a relative `.js` import has no file, retry without the extension and let `sourceExts`
// find the `.ts`. Node and Vite are unaffected.
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = upstreamResolveRequest ?? context.resolveRequest;
  try {
    return resolve(context, moduleName, platform);
  } catch (error) {
    if (moduleName.startsWith('.') && /\.[cm]?js$/.test(moduleName)) {
      return resolve(context, moduleName.replace(/\.[cm]?js$/, ''), platform);
    }
    throw error;
  }
};

module.exports = config;
