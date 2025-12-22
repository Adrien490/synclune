/**
 * Utilitaires pour le formulaire de checkout
 */

import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses";
import type { Session } from "@/modules/auth/lib/auth";

/**
 * Génère les options du formulaire de checkout avec pré-remplissage dynamique
 *
 * @param session - Session utilisateur (null si invité)
 * @param addresses - Adresses enregistrées (null si invité ou aucune adresse)
 * @returns Options du formulaire avec defaultValues pré-remplies
 */
export function getCheckoutFormOptions(
	session: Session | null,
	addresses: GetUserAddressesReturn | null
) {
	// Restaurer les données sauvegardées depuis localStorage (si disponible)
	let savedDraft = null;
	if (typeof window !== "undefined") {
		try {
			const draft = localStorage.getItem("checkout-form-draft");
			if (draft) {
				savedDraft = JSON.parse(draft);
				// Vérifier que le draft n'est pas trop vieux (1h max)
				const ONE_HOUR = 60 * 60 * 1000;
				if (Date.now() - (savedDraft.timestamp || 0) > ONE_HOUR) {
					localStorage.removeItem("checkout-form-draft");
					savedDraft = null;
				}
			}
		} catch (error) {
			// En cas d'erreur de parsing, ignorer et nettoyer
			localStorage.removeItem("checkout-form-draft");
			savedDraft = null;
		}
	}

	// Trouver l'adresse par défaut ou la première adresse
	const defaultAddress =
		addresses && addresses.length > 0
			? addresses.find((addr) => addr.isDefault) || addresses[0]
			: null;

	// Déterminer si l'utilisateur est connecté
	const isGuest = !session;

	// Priorité de pré-remplissage :
	// 1. Données sauvegardées (savedDraft) - utilisateur a commencé à remplir le formulaire
	// 2. Adresse par défaut (defaultAddress) - utilisateur connecté avec adresses
	// 3. Données utilisateur (session.user) - utilisateur connecté sans adresse
	// 4. Valeurs vides - nouvel utilisateur invité

	return {
		defaultValues: {
			// Email pré-rempli pour les invités (vide), caché pour les connectés
			email:
				savedDraft?.email ||
				(isGuest ? "" : session?.user?.email || ""),

			// Adresse de livraison
			shipping: {
				firstName:
					savedDraft?.shipping?.firstName ||
					defaultAddress?.firstName ||
					"",
				lastName:
					savedDraft?.shipping?.lastName ||
					defaultAddress?.lastName ||
					"",
				addressLine1:
					savedDraft?.shipping?.addressLine1 ||
					defaultAddress?.address1 ||
					"",
				addressLine2:
					savedDraft?.shipping?.addressLine2 ||
					defaultAddress?.address2 ||
					"",
				city:
					savedDraft?.shipping?.city ||
					defaultAddress?.city ||
					"",
				postalCode:
					savedDraft?.shipping?.postalCode ||
					defaultAddress?.postalCode ||
					"",
				country:
					savedDraft?.shipping?.country ||
					defaultAddress?.country ||
					"FR",
				phoneNumber:
					savedDraft?.shipping?.phoneNumber ||
					defaultAddress?.phone ||
					"",
			},

			// Consentements
			termsAccepted: false,
		},
	};
}
