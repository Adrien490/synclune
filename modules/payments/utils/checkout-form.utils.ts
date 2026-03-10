/**
 * Utilities for the checkout form
 */

import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses";
import type { Session } from "@/modules/auth/lib/auth";
import type { AppliedDiscount } from "@/modules/discounts/types/discount.types";

/**
 * Generates checkout form options with dynamic pre-filling.
 *
 * localStorage draft is NOT read here to avoid hydration mismatch (server has
 * no localStorage). Draft restoration happens in useCheckoutForm via useEffect.
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

			// Newsletter consent
			newsletterOptIn: false,

			// Save info checkbox (logged-in users only)
			saveInfo: false,

			// Discount (replaces DiscountCodeInput state)
			discountCode: "",
			_appliedDiscount: null as AppliedDiscount | null,
			_discountOpen: false,

			// UI state (replaces useState in AddressStep)
			_selectedAddressId: (defaultAddress?.id ?? null) as string | null,
		},
	};
}
