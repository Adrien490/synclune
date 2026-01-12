/**
 * Types pour les callbacks d'actions et de toasts
 */

import type { ActionState } from "./server-action"

// =============================================================================
// TOAST CALLBACK TYPES
// =============================================================================

/**
 * Options de configuration pour createToastCallbacks
 * @template T - Type du résultat de l'action (défaut: ActionState)
 */
export type CreateToastCallbacksOptions<T = ActionState> = {
	/** Message affiché pendant le chargement (toast.loading) */
	loadingMessage?: string
	/** Afficher un toast de succès (défaut: true) */
	showSuccessToast?: boolean
	/** Afficher un toast de warning (défaut: true) */
	showWarningToast?: boolean
	/** Afficher un toast d'erreur (défaut: true) */
	showErrorToast?: boolean
	/** Callback personnalisé appelé en cas de succès */
	onSuccess?: (result: T) => void
	/** Callback personnalisé appelé en cas de warning */
	onWarning?: (result: T) => void
	/** Callback personnalisé appelé en cas d'erreur */
	onError?: (result: T) => void
	/** Bouton d'action dans le toast de succès */
	successAction?: {
		label: string
		onClick: () => void
	}
}

// =============================================================================
// ACTION CALLBACK TYPES
// =============================================================================

/**
 * Callbacks pour le lifecycle d'une server action
 * @template T - Type du résultat de l'action
 * @template R - Type de la référence retournée par onStart (ex: ID du toast)
 */
export type Callbacks<T, R = unknown> = {
	/** Appelé au démarrage de l'action, retourne une référence optionnelle */
	onStart?: () => R
	/** Appelé à la fin de l'action avec la référence de onStart */
	onEnd?: (reference: R) => void
	/** Appelé si l'action réussit (status === SUCCESS) */
	onSuccess?: (result: T) => void
	/** Appelé si l'action retourne un warning (status === WARNING) */
	onWarning?: (result: T) => void
	/** Appelé si l'action échoue (status !== SUCCESS && status !== WARNING) */
	onError?: (result: T) => void
}
