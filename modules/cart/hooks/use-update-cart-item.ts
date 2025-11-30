"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { updateCartItem } from "@/modules/cart/actions/update-cart-item";

interface UseUpdateCartItemOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour mettre à jour la quantité d'un article dans le panier
 * Compatible avec useActionState de React 19
 */
export const useUpdateCartItem = (options?: UseUpdateCartItemOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateCartItem,
			createToastCallbacks({
				showSuccessToast: false, // Désactivé pour éviter le bruit (optimistic UI suffit)
				showErrorToast: true, // Gardé pour informer l'utilisateur des erreurs
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
