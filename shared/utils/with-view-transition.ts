/**
 * Run a DOM mutation inside a View Transition when supported.
 * Falls back to running the callback synchronously otherwise.
 *
 * @example
 *   withViewTransition(() => onChange(newMedia));
 */
export function withViewTransition(callback: () => void): void {
	if (typeof document !== "undefined" && "startViewTransition" in document) {
		(
			document as Document & { startViewTransition: (cb: () => void) => unknown }
		).startViewTransition(callback);
		return;
	}
	callback();
}
