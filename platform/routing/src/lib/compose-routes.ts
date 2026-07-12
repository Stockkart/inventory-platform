import type { LazyRouteModule, RouteModule } from './types';

export type RoutePackageRegistration = {
  /** Path from `apps/inventory/app` to the package `src/` directory. */
  root: string;
  modules: RouteModule | RouteModule[];
};

export type ComposedRouteEntry = {
  path: string;
  file: string;
};

/** Join module prefix path with a child segment for flat dashboard URLs. */
export function joinRoutePath(modulePath: string, childPath?: string): string {
  if (!childPath) {
    return modulePath;
  }
  if (!modulePath) {
    return childPath;
  }
  return `${modulePath}/${childPath}`;
}

function flattenModule(root: string, mod: RouteModule, entries: ComposedRouteEntry[]): void {
  for (const child of mod.children ?? []) {
    entries.push({
      path: joinRoutePath(mod.path, child.path),
      file: `${root}/${child.file}`,
    });
    if (child.children?.length) {
      flattenNestedChildren(root, joinRoutePath(mod.path, child.path), child, entries);
    }
  }
}

function flattenNestedChildren(
  root: string,
  parentPath: string,
  node: LazyRouteModule,
  entries: ComposedRouteEntry[],
): void {
  for (const child of node.children ?? []) {
    entries.push({
      path: joinRoutePath(parentPath, child.path),
      file: `${root}/${child.file}`,
    });
    if (child.children?.length) {
      flattenNestedChildren(root, joinRoutePath(parentPath, child.path), child, entries);
    }
  }
}

/** Flatten domain `RouteModule` trees into path + file entries for the app shell. */
export function flattenRouteModules(registration: RoutePackageRegistration): ComposedRouteEntry[] {
  const { root, modules } = registration;
  const list = Array.isArray(modules) ? modules : [modules];
  const entries: ComposedRouteEntry[] = [];
  for (const mod of list) {
    flattenModule(root, mod, entries);
  }
  return entries;
}

export function composeDashboardRouteEntries(
  registrations: RoutePackageRegistration[],
): ComposedRouteEntry[] {
  return registrations.flatMap(flattenRouteModules);
}
