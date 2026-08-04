/**
 * Runs the given callback inside a View Transition when supported
 * (Chromium-only as of 2026), otherwise invokes it directly.
 *
 * No-op gracefully under `prefers-reduced-motion: reduce` (le crossfade UA et
 * les morphs `view-transition-name` sont des animations comme les autres) et
 * quand l'API est indisponible (Safari, Firefox). Returns whatever the
 * callback returns so callers can await navigations if needed.
 *
 * SSOT : l'ancien doublon homonyme `with-view-transition.ts` (même nom
 * d'export, signature `void`, feature-detect plus laxiste) a été fusionné ici
 * le 2026-08-03 — ne pas le recréer.
 *
 * @warning
 * Pour les navigations Next.js (`router.push`/`router.replace`), le callback
 * est synchrone du point de vue de `startViewTransition` (router.push ne
 * retourne pas de promise), donc le snapshot peut compléter avant que la
 * nouvelle page ne soit montée. Le pattern fonctionne en pratique mais reste
 * racy ; cf. incident `checkout-back-link-viewtransition-bug-2026-05-20` pour
 * le cas connu (Link natif + history.back). Préférer `<Link>` natif sans
 * wrapper lorsque la transition visuelle n'est pas critique.
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
