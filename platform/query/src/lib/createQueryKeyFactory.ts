export type QueryKeyFactory<T extends string> = {
  all: readonly [T];
} & Record<string, unknown>;

/** Build hierarchical TanStack Query keys for a domain module. */
export function createQueryKeyFactory<T extends string>(
  domain: T
): QueryKeyFactory<T> {
  return {
    all: [domain] as const,
  };
}
