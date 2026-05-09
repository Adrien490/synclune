/**
 * Safe `CSS.supports(property, value)` wrapper.
 *
 * The DOM `lib` types declare `window.CSS` as non-nullable, but runtime
 * environments (older browsers, jsdom in some configurations) may expose
 * it as undefined or without `supports`. This helper returns `false` in
 * any environment that cannot answer the query.
 */
export function cssSupports(property: string, value: string): boolean {
	if (typeof window === "undefined") return false;
	if (!("CSS" in window)) return false;
	if (typeof window.CSS.supports !== "function") return false;
	return window.CSS.supports(property, value);
}
