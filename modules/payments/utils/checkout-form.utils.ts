/**
 * Utilities for the checkout form
 */

import type { Session } from "@/modules/auth/lib/auth";

/**
 * Generates checkout form options with dynamic pre-filling.
 *
 * ⚠️ Il n'existe AUCUNE sauvegarde de brouillon. Ce docblock affirmait
 * « Draft restoration happens in useCheckoutForm via useEffect » — `use-checkout-form.ts`
 * n'a jamais contenu cet effet ni aucun accès à `localStorage`. Un invité perd donc
 * tout son formulaire à chaque rechargement de page.
 *
 * @param session - User session (null if guest)
 * @returns Form options with pre-filled defaultValues
 */
export function getCheckoutFormOptions(session: Session | null) {
	const isGuest = !session;

	return {
		onSubmit: async () => {
			// Validation-only — actual submission handled by PayButton
		},
		defaultValues: {
			email: isGuest ? "" : session.user.email || "",

			// Adresse toujours vierge : le carnet d'adresses a été retiré en V1
			// (simplification 2026-07-30), il n'y a donc plus d'adresse par défaut à
			// préremplir. L'autocomplétion BAN/Geoapify reste, elle, en place.
			shipping: {
				fullName: "",
				addressLine1: "",
				addressLine2: "",
				city: "",
				postalCode: "",
				country: "FR" as const,
				phoneNumber: "",
			},

			// UI state (replaces useState in AddressStep)
		},
	};
}
