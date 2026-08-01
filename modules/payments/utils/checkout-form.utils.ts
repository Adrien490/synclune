/**
 * Utilities for the checkout form
 */

import type { Session } from "@/modules/auth/lib/auth";
import type { AppliedDiscount } from "@/modules/discounts/types/discount.types";

/**
 * Generates checkout form options with dynamic pre-filling.
 *
 * ⚠️ Il n'existe AUCUNE sauvegarde de brouillon. Ce docblock affirmait
 * « Draft restoration happens in useCheckoutForm via useEffect » — `use-checkout-form.ts`
 * n'a jamais contenu cet effet ni aucun accès à `localStorage`. Un invité perd donc
 * tout son formulaire à chaque rechargement de page.
 * @see docs/KNOWN-ISSUES.md — KI-002
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

			// Discount (replaces DiscountCodeInput state)
			discountCode: "",
			_appliedDiscount: null as AppliedDiscount | null,
			_discountOpen: false,
			/**
			 * Message NON bloquant de la section code promo — motif pour lequel un code
			 * repris du panier n'a pas pu être appliqué.
			 *
			 * Volontairement distinct d'une erreur de champ : une erreur sur
			 * `discountCode` rend le formulaire invalide (`canSubmit: false`) et empêche
			 * donc de payer, ce qui serait absurde pour un code que le client n'a pas
			 * saisi ici — a fortiori quand le motif est un rate limit et non la validité
			 * du code. Ce champ informe sans jamais barrer le paiement.
			 */
			_discountNotice: null as string | null,

			// UI state (replaces useState in AddressStep)
		},
	};
}
