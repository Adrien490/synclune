"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

import { useIsTouchDevice } from "./use-touch-device";
import { useMounted } from "./use-mounted";

const STORAGE_PREFIX = "synclune:gesture-hint:";

function hasSeenHint(hintKey: string): boolean {
	try {
		return window.localStorage.getItem(`${STORAGE_PREFIX}${hintKey}`) === "1";
	} catch {
		// localStorage indisponible (Safari privé, quota dépassé) → considère le hint
		// comme déjà vu pour ne jamais risquer de le rejouer en boucle.
		return true;
	}
}

function markHintSeen(hintKey: string): void {
	try {
		window.localStorage.setItem(`${STORAGE_PREFIX}${hintKey}`, "1");
	} catch {
		// no-op : best-effort. La décision est figée via `resolved`, donc l'absence
		// d'écriture ne provoque pas de re-jeu intra-session.
	}
}

interface UseGestureHintOnceOptions {
	/**
	 * Désactive complètement le hint (ex: item de liste non éligible). Permet d'appeler
	 * le hook inconditionnellement (rules-of-hooks) sans déclencher de lecture localStorage
	 * sur les items qui ne doivent pas jouer le hint. @default true
	 */
	enabled?: boolean;
}

/**
 * Décide si un « hint » de geste (peek nudge, coachmark…) doit jouer **une seule fois**
 * sur cet appareil.
 *
 * Retourne `true` à la première frame post-hydratation où toutes les conditions sont
 * réunies, fige la décision (`resolved`) et persiste un flag localStorage. La valeur reste
 * stable pendant la session (le consommateur joue son animation sur la transition false→true,
 * sans re-jeu) ; à la session suivante le flag fait retourner `false`.
 *
 * Conditions (toutes requises) :
 * - composant monté côté client (`useMounted`, évite tout mismatch d'hydratation)
 * - appareil tactile (`useIsTouchDevice`)
 * - `prefers-reduced-motion` désactivé
 * - `options.enabled !== false`
 * - flag localStorage `synclune:gesture-hint:<hintKey>` absent
 */
export function useGestureHintOnce(
	hintKey: string,
	{ enabled = true }: UseGestureHintOnceOptions = {},
): boolean {
	const mounted = useMounted();
	const isTouch = useIsTouchDevice();
	const prefersReducedMotion = useReducedMotion();

	const eligible = mounted && enabled && isTouch && !prefersReducedMotion;

	const [state, setState] = useState({ resolved: false, show: false });

	// Résolution one-shot après mount : on lit localStorage une seule fois (dès que les
	// conditions tactile/motion sont réunies), on fige la décision (`resolved`) et on pose
	// le flag. Un seul setState gardé → aucun re-render en cascade : exception légitime à
	// `react-hooks/set-state-in-effect` (pattern « sync localStorage au mount », cf.
	// `use-long-press.ts`).
	useEffect(() => {
		if (!eligible || state.resolved) return;
		const show = !hasSeenHint(hintKey);
		setState({ resolved: true, show }); // eslint-disable-line react-hooks/set-state-in-effect -- one-shot mount sync, no cascade
		if (show) markHintSeen(hintKey);
	}, [eligible, state.resolved, hintKey]);

	return state.show;
}
