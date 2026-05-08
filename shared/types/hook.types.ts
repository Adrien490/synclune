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
	 * Préserver la page actuelle lors de l'application des filtres
	 * @default false (remet à la page 1)
	 */
	preservePage?: boolean;
}
