/**
 * Types centralisés pour les hooks partagés
 */

// =============================================================================
// FILTER TYPES
// =============================================================================

export type FilterValue = string | string[] | number | boolean | Date;

export interface FilterDefinition {
	id: string; // Unique identifier for the filter (key + value)
	key: string;
	value?: FilterValue;
	label: string;
	displayValue?: string;
}

export interface UseFilterOptions {
	/**
	 * Préfixe pour les paramètres de filtre dans l'URL
	 * @default "filter_"
	 */
	filterPrefix?: string;
	/**
	 * Préserver la position de pagination lors de l'application des filtres.
	 *
	 * Par défaut `false` : `cursor` + `direction` sont supprimés, la liste
	 * repart du début. Les listes du projet sont en pagination curseur —
	 * conserver un curseur issu d'un autre jeu de résultats rend une tranche
	 * arbitraire, sans erreur.
	 *
	 * @default false
	 */
	preservePagination?: boolean;
}
