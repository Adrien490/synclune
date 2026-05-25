/**
 * Run a DOM mutation inside a View Transition when supported.
 * Falls back to running the callback synchronously otherwise.
 *
 * @example
 *   withViewTransition(() => onChange(newMedia));
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
export function withViewTransition(callback: () => void): void {
	if (typeof document !== "undefined" && "startViewTransition" in document) {
		(
			document as Document & { startViewTransition: (cb: () => void) => unknown }
		).startViewTransition(callback);
		return;
	}
	callback();
}
