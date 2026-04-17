"use client";

import { useActionState } from "react";
import { applyCartDiscount } from "../actions/apply-cart-discount";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

/**
 * Hook pour appliquer un code promo au panier (pre-checkout)
 * Toasts success/error auto (haptics intégrés via wrapper toast).
 */
export function useApplyCartDiscount() {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			applyCartDiscount,
			createToastCallbacks({
				loadingMessage: "Vérification du code...",
				showSuccessToast: true,
				showErrorToast: true,
			}),
		),
		undefined,
	);

	return { state, action, isPending };
}
