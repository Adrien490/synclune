"use client";

import { useEffect, useEffectEvent } from "react";

import {
	PULL_TO_REFRESH_EVENT,
	type PullToRefreshEventDetail,
} from "@/shared/components/pull-to-refresh";

/**
 * Branche un rafraîchissement de page sur le geste pull-to-refresh.
 *
 * **Pourquoi c'est nécessaire** : `PullToRefresh` termine par `router.refresh()`,
 * qui re-rend l'arbre RSC mais ne purge PAS les entrées `use cache`. Une liste
 * servie depuis le profil `user` (stale 2 min) renvoyait donc exactement les mêmes
 * données — le geste était un placebo avec spinner. Ce hook fait passer la vraie
 * invalidation (la Server Action derrière le bouton « Rafraîchir X », qui appelle
 * `updateTag`) et PTR l'attend avant son `router.refresh()`.
 *
 * Le geste et le bouton visible partagent ainsi le même chemin d'invalidation :
 * un seul comportement à maintenir, et aucune divergence possible entre les deux.
 *
 * @param refresh Déclencheur d'invalidation. S'il renvoie une promesse, PTR
 *   l'attend (plafonné à 1,5 s côté `PullToRefresh`) ; sinon le geste enchaîne.
 *
 * @example
 * ```tsx
 * const { refresh } = useRefreshProducts();
 * usePullToRefreshHandler(refresh);
 * ```
 */
export function usePullToRefreshHandler(refresh: () => void | Promise<unknown>) {
	// `useEffectEvent` : le callback est recréé à chaque rendu du parent (souvent une
	// closure d'action serveur), l'effet se réabonnerait sinon à chaque rendu.
	const onRefresh = useEffectEvent(() => refresh());

	useEffect(() => {
		function handle(event: Event) {
			// `| undefined` assumé : le cast serait un mensonge face à un `Event` nu
			// dispatché sur le même nom (`detail` vaut alors `null`). Le `?.` ci-dessous
			// s'appuie sur ce type — sans lui il serait signalé comme superflu.
			const detail = (event as CustomEvent<PullToRefreshEventDetail | undefined>).detail;
			const result = onRefresh();
			// N'appeler `waitFor` que s'il y a réellement quelque chose à attendre :
			// PTR n'attend rien quand aucun handler ne s'est enregistré.
			if (result && typeof (result as Promise<unknown>).then === "function") {
				detail?.waitFor(result as Promise<unknown>);
			}
		}

		window.addEventListener(PULL_TO_REFRESH_EVENT, handle);
		return () => window.removeEventListener(PULL_TO_REFRESH_EVENT, handle);
	}, []);
}
