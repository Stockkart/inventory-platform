import { describe, expect, it } from 'vitest';
import { hrNav } from './nav';
import { hrRoutes } from './routes';

describe('HR nav', () => {
  it('lists Settings last, with its own route', () => {
    expect(hrNav.items.at(-1)).toEqual({
      path: '/dashboard/hr/settings',
      label: 'Settings',
      icon: 'settings',
    });
    expect(
      hrRoutes.children?.some((r) => r.path === 'settings' && r.file === 'routes/settings.tsx'),
    ).toBe(true);
  });
});
