/**
 * Runs the given callback inside a View Transition when supported
 * (Chromium-only as of 2026), otherwise invokes it directly.
 *
 * No-op gracefully under `prefers-reduced-motion: reduce` and when the API
 * is unavailable (Safari, Firefox). Returns whatever the callback returns so
 * callers can await navigations if needed.
 */
export function withViewTransition<T>(callback: () => T): T {
	if (typeof document === "undefined") return callback();

	const start =
		typeof (document as Document & { startViewTransition?: unknown }).startViewTransition ===
		"function"
			? (
					document as Document & {
						startViewTransition: (cb: () => void) => { finished: Promise<void> };
					}
				).startViewTransition
			: undefined;

	if (!start) return callback();

	if (
		typeof window !== "undefined" &&
		typeof window.matchMedia === "function" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	) {
		return callback();
	}

	let result: T;
	start.call(document, () => {
		result = callback();
	});
	// biome-ignore lint/style/noNonNullAssertion: startViewTransition executes the cb synchronously before returning
	return result!;
}
