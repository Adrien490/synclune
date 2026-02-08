import { createStore } from "zustand/vanilla"
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware"

import type {
	CookieConsentState,
	CookieConsentStore,
} from "@/shared/types/store.types"

export type { CookieConsentState, CookieConsentActions, CookieConsentStore } from "@/shared/types/store.types"

/**
 * Calculate months difference between two dates (replaces date-fns for bundle size)
 */
function getMonthsDifference(later: Date, earlier: Date): number {
	return (later.getFullYear() - earlier.getFullYear()) * 12
		+ (later.getMonth() - earlier.getMonth())
}

// Noop storage pour le SSR (quand localStorage n'est pas disponible)
const noopStorage: StateStorage = {
	getItem: () => null,
	setItem: () => {},
	removeItem: () => {},
}

/**
 * Version actuelle de la politique de cookies
 * Incrémenter ce numéro force le ré-affichage du banner
 */
export const CURRENT_POLICY_VERSION = 1;

/**
 * Durée maximale du consentement en mois (recommandation CNIL : 6 mois)
 */
const CONSENT_EXPIRY_MONTHS = 6;

export const defaultInitState: CookieConsentState = {
	accepted: null,
	bannerVisible: true,
	consentDate: null,
	policyVersion: 0,
	_hasHydrated: false,
};

/**
 * Crée un store Zustand pour gérer le consentement cookies RGPD
 *
 * Persiste dans localStorage sous la clé "cookie-consent"
 * Durée: 6 mois (recommandation CNIL)
 */
export const createCookieConsentStore = (
	initState: CookieConsentState = defaultInitState
) => {
	return createStore<CookieConsentStore>()(
		persist(
			(set) => ({
				...initState,

				// Actions
				acceptCookies: () => {
					set({
						accepted: true,
						bannerVisible: false,
						consentDate: new Date().toISOString(),
						policyVersion: CURRENT_POLICY_VERSION,
					});
				},

				rejectCookies: () => {
					set({
						accepted: false,
						bannerVisible: false,
						consentDate: new Date().toISOString(),
						policyVersion: CURRENT_POLICY_VERSION,
					});
				},

				showBanner: () => {
					set({ bannerVisible: true });
				},

				hideBanner: () => {
					set({ bannerVisible: false });
				},

				resetConsent: () => {
					set({
						accepted: null,
						bannerVisible: true,
						consentDate: null,
						policyVersion: 0,
					});
				},
			}),
			{
				name: "cookie-consent", // Clé localStorage
				storage: createJSONStorage(() =>
					typeof window !== "undefined" ? localStorage : noopStorage
				),
				// Vérifier la version de la politique au chargement
				onRehydrateStorage: () => (state) => {
					if (state) {
						// Vérifier version politique
						if (state.policyVersion < CURRENT_POLICY_VERSION) {
							// Politique mise à jour → forcer ré-affichage
							state.bannerVisible = true;
						}

						// Vérifier expiration du consentement (6 mois CNIL)
						if (state.consentDate) {
							const consentDate = new Date(state.consentDate);
							const now = new Date();
							const monthsDiff = getMonthsDifference(now, consentDate);

							if (monthsDiff >= CONSENT_EXPIRY_MONTHS) {
								// Consentement expiré → réafficher banner et réinitialiser
								state.bannerVisible = true;
								state.accepted = null;
								state.consentDate = null;
								state.policyVersion = 0;
							}
						}

						// Marquer comme hydraté
						state._hasHydrated = true;
					}
				},
			}
		)
	);
};
