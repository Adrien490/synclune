"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";

/**
 * Hook pour gérer le tri via URL param sortBy
 */
export function useSortSelect() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	// Récupérer la valeur actuelle du tri
	const currentValue = searchParams.get("sortBy") || "";

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

	// Définir une nouvelle valeur de tri
	const setSort = (value: string) => {
		const params = preserveExistingParams();

		// Supprimer d'abord le paramètre existant
		params.delete("sortBy");

		// Ajouter la nouvelle valeur si elle existe
		if (value) {
			params.set("sortBy", value);
		}

		// Réinitialiser la pagination à la page 1 quand le tri change
		params.set("page", "1");

		updateUrlWithParams(params, value);
	};

	// Effacer le tri
	const clearSort = () => {
		const params = preserveExistingParams();
		params.delete("sortBy");

		// Réinitialiser la pagination à la page 1
		params.set("page", "1");

		updateUrlWithParams(params, "");
	};

	return {
		value: optimisticValue,
		setSort,
		clearSort,
		isPending,
	};
}
