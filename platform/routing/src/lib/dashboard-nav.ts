import type { NavContribution, NavContributionItem } from './types';
import type { NavIconName } from './nav-icon-name';

export type DashboardMenuItem = NavContributionItem;

export type DashboardMenuGroup = {
  id: string;
  label: string;
  icon: NavIconName;
  items: DashboardMenuItem[];
};

export type DashboardNavRow = DashboardMenuItem & { groupLabel: string };

export function mergeNavContributions(
  contributions: NavContribution[],
  groupOrder: string[]
): DashboardMenuGroup[] {
  const byId = new Map<string, DashboardMenuGroup>();

  for (const contribution of contributions) {
    const existing = byId.get(contribution.groupId);
    if (!existing) {
      byId.set(contribution.groupId, {
        id: contribution.groupId,
        label: contribution.label,
        icon: contribution.icon,
        items: [...contribution.items],
      });
      continue;
    }

    const paths = new Set(existing.items.map((item) => item.path));
    for (const item of contribution.items) {
      if (!paths.has(item.path)) {
        existing.items.push(item);
        paths.add(item.path);
      }
    }
  }

  const ordered: DashboardMenuGroup[] = [];
  for (const id of groupOrder) {
    const group = byId.get(id);
    if (group && group.items.length > 0) {
      ordered.push(group);
      byId.delete(id);
    }
  }
  for (const group of byId.values()) {
    if (group.items.length > 0) {
      ordered.push(group);
    }
  }
  return ordered;
}

export function getDashboardNavRows(
  groups: DashboardMenuGroup[]
): DashboardNavRow[] {
  const rows: DashboardNavRow[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      rows.push({ ...item, groupLabel: group.label });
    }
  }
  return rows;
}
