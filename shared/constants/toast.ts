/**
 * Constantes de durées pour les toasts Synclune
 *
 * Durées optimisées pour l'expérience e-commerce :
 * - Success : rapide pour ne pas bloquer le parcours d'achat
 * - Error : plus long pour permettre la lecture du message
 * - Loading : infini jusqu'à dismiss programmatique
 */
export const TOAST_DURATIONS = {
	/** 2s - Confirmation rapide (ajout panier, favoris) */
	SUCCESS: 2000,

	/** 3s - Avec bouton d'action */
	SUCCESS_WITH_ACTION: 3000,

	/** 3s - Erreur standard */
	ERROR: 3000,

	/** 5s - Erreurs critiques (paiement, stock) */
	ERROR_CRITICAL: 5000,

	/** 3s - Attention requise */
	WARNING: 3000,

	/** 2.5s - Information contextuelle */
	INFO: 2500,

	/** Infini - Jusqu'à dismiss manuel/programmatique */
	LOADING: Infinity,
} as const;

export type ToastDuration = (typeof TOAST_DURATIONS)[keyof typeof TOAST_DURATIONS];
