"use client";

import { useEffect, useRef, type RefObject } from "react";

const CSS_VAR = "--bottom-bar-height";

/** Registry of all currently active bottom-bar heights, keyed by unique symbol. */
const registry = new Map<symbol, number>();

/** Recompute and apply the CSS variable from all registered heights. */
function syncCssVar() {
	if (registry.size === 0) {
		document.documentElement.style.removeProperty(CSS_VAR);
		return;
	}

	let max = 0;
	for (const h of registry.values()) {
		if (h > max) max = h;
	}
	document.documentElement.style.setProperty(CSS_VAR, `${max}px`);
}

interface UseBottomBarHeightOptions {
	/**
	 * Height used until the element has been measured (and whenever the
	 * measurement reads 0 — see the note on the `measured > 0` guard below).
	 */
	fallback: number;
	/** Whether the bar is currently visible / its height should be registered. */
	enabled?: boolean;
}

/**
 * Registers the **measured** height of a bottom bar in a shared registry and sets
 * `--bottom-bar-height` on `:root` to the max of all registered heights.
 *
 * The height is read from the element (`offsetHeight`) rather than taken on trust
 * from a prop, because the bar's real height is neither a constant nor expressible
 * in px: it is `h-14` (**3.5rem**, so it follows the root font size — WCAG 1.4.4)
 * plus `padding-bottom: env(safe-area-inset-bottom)` (34px on a notched iPhone,
 * 0 elsewhere). A px literal derived from a prop desynchronised from both: at 200 %
 * root font the bar measured 112px while the variable still said 56px, so admin
 * list content and the sticky "Enregistrer" footer sat *behind* the bar. Audit
 * bottom-bar 2026-07-30, P1 — same px-vs-rem class of defect as the breakpoint
 * thresholds fixed on 2026-07-26.
 *
 * Corollary for consumers: `--bottom-bar-height` is the **total** occupied height,
 * safe-area included. Never add `env(safe-area-inset-bottom)` to it again — that
 * would double-count the inset. Locked by
 * `bottom-bar-height-contract.regression.test.ts`.
 *
 * A `ResizeObserver` keeps the value current across root-font-size changes,
 * rotation and safe-area changes.
 *
 * The `max()` reduction assumes registered bars are **mutually exclusive**, not
 * stacked — which holds today (the shop bar is `lg:hidden`, the admin bar is
 * `md:hidden`, they are never co-visible). Two bars stacked at the same time would
 * need a sum, and this hook would under-report.
 *
 * ⚠️ Limite connue : un `RefObject` n'est pas réactif, donc l'effet ne se relance
 * pas si l'élément est *remplacé* sans qu'aucune dépendance ne change — le seul
 * cas réel est une bascule de `prefers-reduced-motion` en cours de session, qui
 * fait passer `BottomBar` de `m.nav` à `<nav>`. La valeur publiée reste juste
 * (même hauteur) ; seul le suivi live du nouveau noeud est perdu jusqu'à la
 * prochaine variation de `fallback`/`enabled`. Passer à un ref *callback* + state
 * le corrigerait, au prix d'un rendu supplémentaire à chaque montage — non retenu
 * pour un scénario qui ne dégrade pas la valeur.
 *
 * @param ref - Ref to the bar element to measure
 * @param options - `fallback` height in px, and whether registration is `enabled`
 */
export function useBottomBarHeight(
	ref: RefObject<HTMLElement | null>,
	{ fallback, enabled = true }: UseBottomBarHeightOptions,
) {
	const keyRef = useRef<symbol | null>(null);

	// Lazy init null-guardée (pas `??=` : non supporté par le React Compiler).
	// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- `??=` non supporté par le React Compiler
	if (keyRef.current === null) {
		keyRef.current = Symbol("bottom-bar");
	}

	useEffect(() => {
		const key = keyRef.current!;

		if (!enabled) {
			if (registry.has(key)) {
				registry.delete(key);
				syncCssVar();
			}
			return;
		}

		const element = ref.current;

		const publish = () => {
			const measured = element?.offsetHeight ?? 0;
			// ⚠️ Le repli sur 0 n'est pas cosmétique. Au moment où la barre devient
			// visible, la media query CSS (`md:hidden`) et la `matchMedia` JS peuvent
			// encore diverger d'une fraction de px sur les DPR fractionnaires — c'est
			// la raison documentée du choix de la syntaxe range. Sans ce garde on
			// publierait `0px` pour une barre bien présente, et tous les
			// consommateurs colleraient leur contenu dessous. Couvre aussi jsdom, où
			// `offsetHeight` vaut toujours 0.
			registry.set(key, measured > 0 ? measured : fallback);
			syncCssVar();
		};

		publish();

		const observer = element ? new ResizeObserver(publish) : null;
		observer?.observe(element!);

		return () => {
			observer?.disconnect();
			registry.delete(key);
			syncCssVar();
		};
	}, [ref, fallback, enabled]);
}

// Exported for testing only
export { registry as _registry };
