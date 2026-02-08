/**
 * Types centralisés pour les hooks partagés
 */

import type { RefObject } from "react"

// =============================================================================
// FILTER TYPES
// =============================================================================

export type FilterValue = string | string[] | number | boolean | Date

export interface FilterDefinition {
	id: string // Unique identifier for the filter (key + value)
	key: string
	value?: FilterValue
	label: string
	displayValue?: string
}

export interface UseFilterOptions {
	/**
	 * Préfixe pour les paramètres de filtre dans l'URL
	 * @default "filter_"
	 */
	filterPrefix?: string
	/**
	 * Préserver la page actuelle lors de l'application des filtres
	 * @default false (remet à la page 1)
	 */
	preservePage?: boolean
}

// =============================================================================
// CURSOR PAGINATION TYPES
// =============================================================================

export interface UseCursorPaginationProps {
	nextCursor: string | null
	prevCursor: string | null
	/**
	 * Callback appelé après chaque navigation pour gérer le focus
	 * Par défaut, scroll vers le haut de la page
	 */
	onNavigate?: () => void
	/**
	 * Ref vers l'élément qui doit recevoir le focus après navigation
	 * Améliore l'accessibilité en permettant aux utilisateurs de clavier/screen reader
	 * de reprendre la navigation depuis le bon endroit
	 */
	focusTargetRef?: RefObject<HTMLElement | null>
	/**
	 * Active les raccourcis clavier pour la pagination
	 * Alt+ArrowLeft = Page précédente
	 * Alt+ArrowRight = Page suivante
	 * @default true
	 */
	enableKeyboardShortcuts?: boolean
}
