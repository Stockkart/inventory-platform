import { describe, expect, it } from 'vitest';
import { isCalculatorToggle } from './dashboardHotkeys';
import { bindingConflictsWithBuiltIns } from './favoritePageShortcuts';

function keydown(init: Partial<KeyboardEvent>): KeyboardEvent {
  return {
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    key: '',
    code: '',
    ...init,
  } as KeyboardEvent;
}

describe('isCalculatorToggle', () => {
  it('matches Alt+C by physical key, since macOS reports Alt+C as "ç"', () => {
    expect(isCalculatorToggle(keydown({ altKey: true, key: 'ç', code: 'KeyC' }))).toBe(true);
  });

  it('ignores C without Alt, and Alt+C with Cmd or Ctrl', () => {
    expect(isCalculatorToggle(keydown({ key: 'c', code: 'KeyC' }))).toBe(false);
    expect(isCalculatorToggle(keydown({ altKey: true, ctrlKey: true, code: 'KeyC' }))).toBe(false);
    expect(isCalculatorToggle(keydown({ altKey: true, metaKey: true, code: 'KeyC' }))).toBe(false);
  });
});

describe('favourite shortcuts cannot take Alt+C', () => {
  it('reserves plain Alt+C', () => {
    expect(
      bindingConflictsWithBuiltIns({
        kind: 'chord',
        mod: false,
        alt: true,
        shift: false,
        key: 'c',
      }),
    ).toBe(true);
  });

  it('leaves other Alt letters and Alt+Shift+C free', () => {
    expect(
      bindingConflictsWithBuiltIns({
        kind: 'chord',
        mod: false,
        alt: true,
        shift: false,
        key: 'd',
      }),
    ).toBe(false);
    expect(
      bindingConflictsWithBuiltIns({ kind: 'chord', mod: false, alt: true, shift: true, key: 'c' }),
    ).toBe(false);
  });
});
