/**
 * Utilitaires pour le formulaire de checkout
 */

import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses";
import type { Session } from "@/modules/auth/lib/auth";
import type { AppliedDiscount } from "@/modules/discounts/types/discount.types";

/**
 * Génère les options du formulaire de checkout avec pré-remplissage dynamique
 *
 * localStorage draft is NOT read here to avoid hydration mismatch (server has
 * no localStorage). Draft restoration happens in useCheckoutForm via useEffect.
 *
 * @param session - Session utilisateur (null si invité)
 * @param addresses - Adresses enregistrées (null si invité ou aucune adresse)
 * @returns Options du formulaire avec defaultValues pré-remplies
 */
export function getCheckoutFormOptions(
	session: Session | null,
	addresses: GetUserAddressesReturn | null,
) {
	// Trouver l'adresse par défaut ou la première adresse
	const defaultAddress =
		addresses && addresses.length > 0
			? (addresses.find((addr) => addr.isDefault) ?? addresses[0])
			: null;

	// Déterminer si l'utilisateur est connecté
	const isGuest = !session;

	// Construire fullName depuis les données existantes
	const buildFullName = () => {
		if (defaultAddress?.firstName || defaultAddress?.lastName) {
			return `${defaultAddress.firstName || ""} ${defaultAddress.lastName || ""}`.trim();
		}
		return "";
	};

	return {
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

			termsAccepted: false,

			// Discount (replaces DiscountCodeInput state)
			discountCode: "",
			_appliedDiscount: null as AppliedDiscount | null,
			_discountOpen: false,

			// UI state (replaces useState in AddressStep)
			_selectedAddressId: (defaultAddress?.id ?? null) as string | null,
			_showAddressLine2: !!defaultAddress?.address2,
		},
	};
}
