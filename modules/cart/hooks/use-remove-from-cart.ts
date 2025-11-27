"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { useActionState } from "react";
import { removeFromCart } from "@/modules/cart/actions/remove-from-cart";

interface UseRemoveFromCartOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour supprimer un article du panier
 * Compatible avec useActionState de React 19
 */
export const useRemoveFromCart = (options?: UseRemoveFromCartOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			removeFromCart,
			createToastCallbacks({
				showSuccessToast: false,
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"message" in result &&
						typeof result.message === "string"
					) {
						options?.onSuccess?.(result.message);
					}
				},
			})
		),
		undefined
	);

	return {
		state,
		action,
		isPending,
	};
};
