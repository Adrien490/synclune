/**
 * Utilities for the checkout form
 */

import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses";
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
 * @param addresses - Saved addresses (null if guest or no addresses)
 * @returns Form options with pre-filled defaultValues
 */
export function getCheckoutFormOptions(
	session: Session | null,
	addresses: GetUserAddressesReturn | null,
) {
	// Find default address or first address
	const defaultAddress =
		addresses && addresses.length > 0
			? (addresses.find((addr) => addr.isDefault) ?? addresses[0])
			: null;

	const isGuest = !session;

	const buildFullName = () => {
		if (defaultAddress?.firstName || defaultAddress?.lastName) {
			return `${defaultAddress.firstName || ""} ${defaultAddress.lastName || ""}`.trim();
		}
		return "";
	};

	return {
		onSubmit: async () => {
			// Validation-only — actual submission handled by PayButton
		},
		defaultValues: {
			email: isGuest ? "" : session.user.email || "",

			shipping: {
				fullName: buildFullName(),
				addressLine1: defaultAddress?.address1 ?? "",
				addressLine2: defaultAddress?.address2 ?? "",
				city: defaultAddress?.city ?? "",
				postalCode: defaultAddress?.postalCode ?? "",
				country: defaultAddress?.country ?? "FR",
				phoneNumber: defaultAddress?.phone ?? "",
			},

			// Save info checkbox (logged-in users only)
			saveInfo: false,

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
			_selectedAddressId: (defaultAddress?.id ?? null) as string | null,
		},
	};
}
