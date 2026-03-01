/**
 * Option de tri pour les composants UI (SortSelect, SortDrawer)
 */
export type SortOption = {
	value: string;
	label: string;
};

/**
 * Extracts the values of a const object as a readonly tuple type.
 *
 * Useful for converting `Object.values(SORT_OPTIONS)` to a properly typed
 * readonly array without needing `as unknown as readonly (...)[]`.
 *
 * @example
 * const SORT_OPTIONS = { A: "a", B: "b" } as const;
 * const fields: ReadonlyValues<typeof SORT_OPTIONS> = Object.values(SORT_OPTIONS);
 */
export type ReadonlyValues<T extends Record<string, unknown>> = readonly T[keyof T][];
