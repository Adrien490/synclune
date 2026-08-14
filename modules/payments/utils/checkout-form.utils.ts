/**
 * Utilities for the checkout form
 */

/**
 * Generates checkout form options.
 *
 * Le parcours d'achat est 100 % invité (migration lean, lot 1) : plus de
 * pré-remplissage d'email de compte.
 *
 * ⚠️ Il n'existe AUCUNE sauvegarde de brouillon. Ce docblock affirmait
 * « Draft restoration happens in useCheckoutForm via useEffect » — `use-checkout-form.ts`
 * n'a jamais contenu cet effet ni aucun accès à `localStorage`. Un invité perd donc
 * tout son formulaire à chaque rechargement de page.
 *
 * @returns Form options with default values
 */
export function getCheckoutFormOptions() {
	return {
		onSubmit: async () => {
			// Validation-only — actual submission handled by PayButton
		},
		defaultValues: {
			email: "",

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
