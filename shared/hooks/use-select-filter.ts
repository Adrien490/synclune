"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";

/**
 * Hook pour gérer l'état du filtrage avec un select simple
 * Gère un seul filtre avec une seule valeur
 */
export function useSelectFilter(filterKey: string) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	// Préfixe pour les filtres dans l'URL
	const paramKey = `filter_${filterKey}`;

	// Récupérer la valeur actuelle du filtre (première valeur uniquement)
	const currentValue = searchParams.get(paramKey) || "";

	// État optimiste pour une meilleure UX
	const [optimisticValue, setOptimisticValue] =
		useOptimistic<string>(currentValue);

	// Mise à jour de l'URL avec les nouveaux paramètres
	const updateUrlWithParams = (params: URLSearchParams, newValue: string) => {
		startTransition(() => {
			setOptimisticValue(newValue);
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	// Préservation des paramètres existants
	const preserveExistingParams = () => {
		const params = new URLSearchParams(searchParams);
		return params;
	};

	// Définir une nouvelle valeur de filtre
	const setFilter = (value: string) => {
		const params = preserveExistingParams();

		// Supprimer d'abord le paramètre existant
		params.delete(paramKey);

		// Ajouter la nouvelle valeur si elle existe
		if (value) {
			params.set(paramKey, value);
		}

		// IMPORTANT: Réinitialiser la pagination à la page 1 quand un filtre change
		// Cela permet d'éviter des pages vides quand le nombre de résultats diminue
		params.set("page", "1");

		updateUrlWithParams(params, value);
	};

	// Effacer le filtre
	const clearFilter = () => {
		const params = preserveExistingParams();
		params.delete(paramKey);

		// Réinitialiser également la pagination à la page 1 quand on efface un filtre
		params.set("page", "1");

		updateUrlWithParams(params, "");
	};

	return {
		value: optimisticValue,
		setFilter,
		clearFilter,
		isPending,
	};
}
