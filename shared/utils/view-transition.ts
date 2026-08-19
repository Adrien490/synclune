/**
 * Démarre une View Transition autour d'une mutation d'état **synchrone**,
 * quand l'API est disponible (Chromium, Safari récent) — sinon exécute le
 * callback tel quel. No-op sous `prefers-reduced-motion: reduce`. Retourne ce
 * que retourne le callback.
 *
 * ⚠️ **PLUS JAMAIS AUTOUR D'UNE NAVIGATION.** Les 34 sites qui enveloppaient un
 * `router.push`/`router.replace` ont été retirés le 2026-08-18 : le snapshot
 * partait avant que la page suivante ne soit montée (la navigation n'est pas
 * synchrone du point de vue de `startViewTransition`), donc la transition se
 * jouait entre l'ancienne page et… l'ancienne page. C'était le bug
 * `checkout-back-link-viewtransition-bug-2026-05-20`. Ces navigations passent
 * désormais `PAGE_FADE_NAVIGATION` (`shared/constants/view-transitions.ts`), et
 * ce sont les frontières `<ViewTransition>` des deux layouts qui animent :
 * React possède la transition, il ne prend le snapshot d'arrivée qu'une fois le
 * nouveau contenu prêt. Verrouillé par
 * `view-transition-navigation.regression.test.ts`.
 *
 * Le seul consommateur restant est `media-upload-grid` (réordonner / retirer un
 * média), et il est légitime : `onChange()` est un `setState` **synchrone**,
 * React le flushe dans la micro-tâche qui suit le callback, donc le snapshot
 * d'arrivée voit bien la nouvelle grille. Un `<ViewTransition>` n'y ferait rien
 * de plus sans passer d'abord ces mutations en `startTransition` — ce qui
 * retarderait le retour visuel d'un geste de tri direct.
 *
 * SSOT : l'ancien doublon homonyme `with-view-transition.ts` (même nom
 * d'export, signature `void`, feature-detect plus laxiste) a été fusionné ici
 * le 2026-08-03 — ne pas le recréer.
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
