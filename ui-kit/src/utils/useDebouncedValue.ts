import { useEffect, useState } from 'react';

/**
 * Follows `value` after it has stopped changing for `delayMs`. Changes are detected by identity,
 * so pass a primitive or a memoised value; a new object each render never settles.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
