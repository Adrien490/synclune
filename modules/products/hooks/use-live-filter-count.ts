"use client";

import { useEffect, useRef, useState } from "react";

import {
	countFilteredProducts,
	type CountFilteredProductsResult,
} from "../actions/count-filtered-products";
import type { FilterFormData, FilterSectionId } from "../services/product-filter-params.service";

const DEBOUNCE_MS = 300;

export interface LiveFilterCount {
	/** Nombre de pièces pour les valeurs en attente ; null tant qu'aucune réponse. */
	count: number | null;
	/** Les valeurs courantes n'ont pas encore leur chiffre — recalcul en vol. */
	isUpdating: boolean;
	/**
	 * Le chiffre courant n'est PAS celui des valeurs courantes : la requête a
	 * échoué (rate limit / erreur) et `count` porte le dernier chiffre connu,
	 * calculé pour d'AUTRES critères. L'appelant doit alors s'abstenir d'annoncer
	 * un nombre — « Voir les 12 pièces » serait une promesse fausse.
	 */
	countUnavailable: boolean;
	/** Sortie chiffrée de l'état vide, si le serveur en a trouvé une. */
	relaxed: { group: FilterSectionId; count: number } | null;
}

interface ResolvedCount {
	/** Clé des valeurs auxquelles ce résultat répond. */
	key: string;
	count: number | null;
	relaxed: { group: FilterSectionId; count: number } | null;
	/** Clé marquée résolue par un ÉCHEC : le count est celui d'avant. */
	stale?: boolean;
}

/** Groupe modifié entre deux jeux de valeurs — undefined si 0 ou 2+ groupes bougent. */
function diffChangedGroup(prev: FilterFormData, next: FilterFormData): FilterSectionId | undefined {
	const changed: FilterSectionId[] = [];
	const sameArray = (a: string[], b: string[]) =>
		a.length === b.length && [...a].sort().join(" ") === [...b].sort().join(" ");

	if (!sameArray(prev.productTypes, next.productTypes)) changed.push("types");
	if (!sameArray(prev.colors, next.colors)) changed.push("colors");
	if (!sameArray(prev.materials, next.materials)) changed.push("materials");
	if (prev.priceRange[0] !== next.priceRange[0] || prev.priceRange[1] !== next.priceRange[1]) {
		changed.push("price");
	}
	if (prev.inStockOnly !== next.inStockOnly) {
		changed.push("availability");
	}

	return changed.length === 1 ? changed[0] : undefined;
}

/**
 * Compteur vivant du panneau de filtres : recompte côté serveur (débounce
 * 300 ms) à chaque changement des valeurs EN ATTENTE du formulaire — c'est ce
 * qui permet « Voir les N pièces » avant de fermer le panneau.
 *
 * - `isUpdating` est DÉRIVÉ pendant le rendu (clé courante ≠ clé résolue) —
 *   pas de setState synchrone dans l'effet, seul l'atterrissage de la réponse
 *   réseau écrit l'état ;
 * - garde anti-réordonnancement : un id monotone invalide les réponses périmées ;
 * - `error` : le dernier chiffre connu est conservé, sans bruit ;
 * - inactif tant que `enabled` est faux (panneau fermé — aucun réveil DB).
 */
export function useLiveFilterCount(params: {
	values: FilterFormData;
	maxPriceInEuros: number;
	search?: string;
	enabled: boolean;
	/**
	 * Compte des valeurs INITIALES, déjà connu du serveur (la grille vient de le
	 * rendre). Il sème l'état résolu, donc ouvrir le panneau sans rien toucher
	 * n'envoie AUCUNE requête : un réveil Neon de moins par ouverture, et le
	 * bouton annonce « Voir les 48 pièces » d'emblée au lieu du libellé neutre
	 * pendant le débounce + l'aller-retour.
	 */
	initialCount?: number | null;
}): LiveFilterCount {
	const { values, maxPriceInEuros, search, enabled, initialCount } = params;

	// Clé sérialisée : l'objet `values` change d'identité à chaque render du
	// form TanStack — l'effet ne doit se rejouer que sur un changement RÉEL.
	// Calculée AVANT l'état : elle sert de clé à la graine initiale.
	// `sortBy` en est EXCLU : le tri ne change pas le compte, le sérialiser
	// déclencherait un recomptage serveur (et un réveil Neon) par changement
	// de tri — et invaliderait la graine `initialCount` pour rien.
	const { sortBy: _sortBy, ...countedValues } = values;
	const valuesKey = JSON.stringify({ values: countedValues, search });

	const [resolved, setResolved] = useState<ResolvedCount | null>(() =>
		initialCount == null ? null : { key: valuesKey, count: initialCount, relaxed: null },
	);

	const requestIdRef = useRef(0);
	const prevValuesRef = useRef<FilterFormData | null>(null);

	useEffect(() => {
		if (!enabled) return;
		// Déjà répondu pour ces valeurs (graine serveur, ou réponse précédente) :
		// rien à redemander. C'est ce qui rend l'ouverture du panneau gratuite.
		// Lecture directe de `resolved` : l'effet est reprogrammé sur `valuesKey`,
		// donc sa fermeture porte le `resolved` du rendu courant ; et l'atterrissage
		// d'une réponse ne le rejoue pas (deps inchangées), donc pas de boucle.
		if (resolved?.key === valuesKey) return;

		const requestId = ++requestIdRef.current;

		const timer = setTimeout(() => {
			// Le diff est calculé À L'ENVOI, pas à la programmation du debounce :
			// écrit plus tôt, `prevValuesRef` avançait sur des valeurs jamais
			// envoyées, et deux modifications dans deux groupes différents sous
			// 300 ms perdaient `lastChangedGroup` — la sortie chiffrée de l'état
			// vide retombait alors en silence sur la copie générique.
			const lastChangedGroup = prevValuesRef.current
				? diffChangedGroup(prevValuesRef.current, values)
				: undefined;
			prevValuesRef.current = values;

			void countFilteredProducts({
				...countedValues,
				maxPriceInEuros,
				search,
				lastChangedGroup,
			}).then((result: CountFilteredProductsResult) => {
				if (requestId !== requestIdRef.current) return; // réponse périmée
				if (result.kind !== "success") {
					// Marquer la clé résolue quand même : sinon « mise à jour… » à vie
					// sur un rate limit. Mais `stale` dit que le chiffre conservé
					// répond à d'autres critères — l'appelant ne doit pas l'annoncer.
					setResolved((s) => ({
						key: valuesKey,
						count: s?.count ?? null,
						relaxed: null,
						stale: true,
					}));
					return;
				}
				setResolved({
					key: valuesKey,
					count: result.count,
					relaxed: result.count === 0 ? (result.relaxed ?? null) : null,
				});
			});
		}, DEBOUNCE_MS);

		return () => clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [valuesKey, enabled, maxPriceInEuros]);

	const isResolvedForCurrent = resolved?.key === valuesKey;

	return {
		count: resolved?.count ?? null,
		isUpdating: enabled && !isResolvedForCurrent,
		countUnavailable: isResolvedForCurrent && resolved.stale === true,
		relaxed: isResolvedForCurrent ? resolved.relaxed : null,
	};
}
