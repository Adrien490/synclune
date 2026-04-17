"use client";

import { useActionState } from "react";
import { clearCart } from "../actions/clear-cart";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

/**
 * Hook pour vider intégralement le panier (reset items + discount + notes).
 * Toasts success/error auto (haptics intégrés via wrapper toast).
 */
export function useClearCart(onSuccess?: () => void) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			clearCart,
			createToastCallbacks({
				loadingMessage: "Vidage du panier...",
				showSuccessToast: true,
				showErrorToast: true,
				onSuccess: () => onSuccess?.(),
			}),
		),
		undefined,
	);

	return { state, action, isPending };
}
