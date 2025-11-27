"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export type FilterValue = string | string[] | number | boolean | Date;

export interface FilterDefinition {
	id: string; // Unique identifier for the filter (key + value)
	key: string;
	value?: FilterValue;
	label: string;
	displayValue?: string;
}

interface UseFilterOptions {
	/**
	 * Préfixe pour les paramètres de filtre dans l'URL
	 * @default "filter_"
	 */
	filterPrefix?: string;
	/**
	 * Préserver la page actuelle lors de l'application des filtres
	 * @default false (remet à la page 1)
	 */
	preservePage?: boolean;
}

export function useFilter(options: UseFilterOptions = {}) {
	const { filterPrefix = "filter_", preservePage = false } = options;

	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	// Extraire les filtres actifs depuis l'URL
	const getActiveFilters = (): FilterDefinition[] => {
		const filters: FilterDefinition[] = [];

		searchParams.forEach((value, key) => {
			// Ignorer les paramètres de navigation
			if (
				[
					"page",
					"perPage",
					"sortBy",
					"sortOrder",
					"search",
					"cursor",
					"direction",
					"filter_sortBy", // Aussi ignorer si préfixé
				].includes(key)
			) {
				return;
			}

			// Vérifier que c'est un paramètre de filtre
			// Si filterPrefix est vide, on accepte tous les paramètres (sauf ceux exclus ci-dessus)
			if (filterPrefix && !key.startsWith(filterPrefix)) {
				return;
			}

			// Retirer le préfixe pour obtenir la clé du filtre
			const filterKey = key.replace(filterPrefix, "");

			// Créer un ID unique basé sur la clé ET la valeur
			const uniqueId = `${key}-${value}`;

			filters.push({
				id: uniqueId,
				key,
				value,
				label: filterKey,
				displayValue: value,
			});
		});

		return filters;
	};

	const activeFilters = getActiveFilters();

	// Construire une nouvelle URL avec les paramètres mis à jour
	const buildUrl = (params: URLSearchParams): string => {
		return params.toString() ? `${pathname}?${params.toString()}` : pathname;
	};

	// Préserver les paramètres existants (sauf filtres)
	const preserveNonFilterParams = (): URLSearchParams => {
		const params = new URLSearchParams();

		searchParams.forEach((value, key) => {
			// Ne pas copier les filtres
			if (key.startsWith(filterPrefix)) {
				return;
			}
			params.append(key, value);
		});

		// Remettre la page à 1 si nécessaire
		if (!preservePage) {
			params.set("page", "1");
		}

		return params;
	};

	/**
	 * Définir plusieurs filtres en une seule fois
	 */
	const setFilters = (filters: Record<string, FilterValue | undefined>) => {
		startTransition(() => {
			const params = preserveNonFilterParams();

			// Ajouter les nouveaux filtres
			Object.entries(filters).forEach(([key, value]) => {
				if (value === undefined || value === null || value === "") {
					return;
				}

				const fullKey = key.startsWith(filterPrefix)
					? key
					: `${filterPrefix}${key}`;

				if (Array.isArray(value)) {
					value.forEach((v) => params.append(fullKey, String(v)));
				} else if (value instanceof Date) {
					params.set(fullKey, value.toISOString());
				} else {
					params.set(fullKey, String(value));
				}
			});

			router.replace(buildUrl(params));
		});
	};

	/**
	 * Définir un seul filtre
	 */
	const setFilter = (key: string, value: FilterValue | undefined) => {
		setFilters({ [key]: value });
	};

	/**
	 * Supprimer un filtre spécifique
	 */
	const removeFilter = (filterKey: string, filterValue?: string) => {
		startTransition(() => {
			const params = new URLSearchParams(searchParams.toString());

			// Si une valeur spécifique est fournie (pour les multi-valeurs)
			if (filterValue !== undefined) {
				const currentValues = params.getAll(filterKey);
				if (currentValues.length > 1) {
					params.delete(filterKey);
					currentValues
						.filter((v) => v !== filterValue)
						.forEach((v) => params.append(filterKey, v));
				} else {
					params.delete(filterKey);
				}
			} else {
				params.delete(filterKey);
			}

			// Remettre la page à 1
			if (!preservePage) {
				params.set("page", "1");
			}

			router.replace(buildUrl(params));
		});
	};

	/**
	 * Supprimer plusieurs filtres
	 */
	const removeFilters = (filterKeys: string[]) => {
		startTransition(() => {
			const params = new URLSearchParams(searchParams.toString());

			filterKeys.forEach((key) => params.delete(key));

			if (!preservePage) {
				params.set("page", "1");
			}

			router.replace(buildUrl(params));
		});
	};

	/**
	 * Supprimer tous les filtres
	 */
	const clearAllFilters = () => {
		startTransition(() => {
			const params = new URLSearchParams(searchParams.toString());

			// Supprimer tous les paramètres de filtre
			const keysToDelete: string[] = [];
			params.forEach((_, key) => {
				if (key.startsWith(filterPrefix)) {
					keysToDelete.push(key);
				}
			});
			keysToDelete.forEach((key) => params.delete(key));

			if (!preservePage) {
				params.set("page", "1");
			}

			router.replace(buildUrl(params));
		});
	};

	/**
	 * Obtenir la valeur d'un filtre
	 */
	const getFilter = (key: string): string | null => {
		const fullKey = key.startsWith(filterPrefix) ? key : `${filterPrefix}${key}`;
		return searchParams.get(fullKey);
	};

	/**
	 * Obtenir toutes les valeurs d'un filtre (pour les multi-valeurs)
	 */
	const getFilterAll = (key: string): string[] => {
		const fullKey = key.startsWith(filterPrefix) ? key : `${filterPrefix}${key}`;
		return searchParams.getAll(fullKey);
	};

	/**
	 * Vérifier si un filtre est actif
	 */
	const hasFilter = (key: string): boolean => {
		const fullKey = key.startsWith(filterPrefix) ? key : `${filterPrefix}${key}`;
		return searchParams.has(fullKey);
	};

	return {
		// État
		isPending,
		activeFilters,
		activeFiltersCount: activeFilters.length,
		hasActiveFilters: activeFilters.length > 0,

		// Actions
		setFilter,
		setFilters,
		removeFilter,
		removeFilters,
		clearAllFilters,

		// Getters
		getFilter,
		getFilterAll,
		hasFilter,
	};
}
