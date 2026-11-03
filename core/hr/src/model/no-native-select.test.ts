// R13.4: every choice list in HR uses the app's own dropdowns (FilterDropdown + ChoiceList,
// SegmentedControl, MonthPicker), never the browser's `<select>` nor ui-kit `Select`.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('..', import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    // Tests are left out: this file names the banned patterns itself.
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('core/hr choice lists', () => {
  const files = sourceFiles(SRC);

  it('finds the HR sources', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('has no native <select> and no ui-kit Select', () => {
    const offenders = files.filter((file) => {
      const text = readFileSync(file, 'utf8');
      const nativeSelect = /<select[\s>]/.test(text);
      // `Select` imported from ui-kit (alone or in a list), e.g. `import { Select } from …ui-kit'`.
      const uiKitSelect =
        /import\s*{[^}]*\bSelect\b[^}]*}\s*from\s*'@inventory-platform\/ui-kit'/s.test(text);
      return nativeSelect || uiKitSelect;
    });
    expect(offenders.map((f) => relative(SRC, f))).toEqual([]);
  });
});
