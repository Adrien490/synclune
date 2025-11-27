/**
 * Constantes de durées pour les toasts Synclune
 *
 * Durées optimisées pour l'expérience e-commerce :
 * - Success : rapide pour ne pas bloquer le parcours d'achat
 * - Error : plus long pour permettre la lecture du message
 * - Loading : infini jusqu'à dismiss programmatique
 */
export const TOAST_DURATIONS = {
	/** 3s - Confirmation rapide (ajout panier, favoris) */
	SUCCESS: 3000,

	/** 5s - Avec bouton d'action */
	SUCCESS_WITH_ACTION: 5000,

	/** 6s - Erreur standard (temps de lecture) */
	ERROR: 6000,

	/** 8s - Erreurs critiques (paiement, stock) */
	ERROR_CRITICAL: 8000,

	/** 5s - Attention requise */
	WARNING: 5000,

	/** 4s - Information contextuelle */
	INFO: 4000,

	/** Infini - Jusqu'à dismiss manuel/programmatique */
	LOADING: Infinity,
} as const;

export type ToastDuration = (typeof TOAST_DURATIONS)[keyof typeof TOAST_DURATIONS];
