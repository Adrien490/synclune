/**
 * Utilitaires pour le formulaire de checkout
 */

import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses";
import type { Session } from "@/modules/auth/lib/auth";

/** Increment when the draft schema changes to invalidate old drafts */
export const DRAFT_VERSION = 1;

export interface CheckoutDraft {
	version?: number;
	timestamp?: number;
	email?: string;
	shipping?: {
		fullName?: string;
		firstName?: string;
		lastName?: string;
		addressLine1?: string;
		addressLine2?: string;
		city?: string;
		postalCode?: string;
		country?: string;
		phoneNumber?: string;
	};
}

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
		},
	};
}
