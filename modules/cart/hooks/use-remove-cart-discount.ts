"use client";

import { useActionState } from "react";
import { removeCartDiscount } from "../actions/remove-cart-discount";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

/**
 * Hook pour retirer le code promo applique au panier (pre-checkout).
 * Toasts success/error auto (haptics integres via wrapper toast).
 */
export function useRemoveCartDiscount() {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			removeCartDiscount,
			createToastCallbacks({
				loadingMessage: "Retrait du code…",
				showSuccessToast: true,
				showErrorToast: true,
			}),
		),
		undefined,
	);

	return { state, action, isPending };
}
