"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useRef, useTransition } from "react";
import { updateCartItem } from "@/modules/cart/actions/update-cart-item";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";

interface UseUpdateCartItemOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour modifier la quantité d'un article du panier
 * Compatible avec useActionState de React 19
 *
 * Inclut optimistic UI pour le badge navbar via useBadgeCountsStore
 * avec rollback en cas d'erreur.
 *
 * Pattern inspiré de useAddToCart :
 * - L'action est soumise immédiatement (pas de debounce)
 * - Le delta est appliqué au badge avant la soumission
 * - Rollback automatique en cas d'erreur
 */
export const useUpdateCartItem = (options?: UseUpdateCartItemOptions) => {
	// Store pour optimistic UI du badge navbar
	const adjustCart = useBadgeCountsStore((state) => state.adjustCart);

	// Ref pour stocker le delta pending (pour rollback)
	const pendingDeltaRef = useRef<number>(0);

	const [isTransitionPending, startTransition] = useTransition();

	const [state, formAction, isActionPending] = useActionState(
		withCallbacks(
			updateCartItem,
			createToastCallbacks({
				showSuccessToast: false,
				onSuccess: (result: unknown) => {
					// Reset le delta après succès
					pendingDeltaRef.current = 0;

					if (
						result &&
						typeof result === "object" &&
						"message" in result &&
						typeof result.message === "string"
					) {
						options?.onSuccess?.(result.message);
					}
				},
				onError: () => {
					// Rollback du badge navbar
					adjustCart(-pendingDeltaRef.current);
					pendingDeltaRef.current = 0;
				},
			})
		),
		undefined
	);

	/**
	 * Soumet le changement de quantité avec optimistic UI
	 * @param formData - Les données du formulaire (cartItemId, quantity)
	 * @param delta - La différence de quantité pour le badge (ex: +1 ou -1)
	 */
	const action = (formData: FormData, delta: number) => {
		startTransition(() => {
			// Optimistic update du badge navbar
			pendingDeltaRef.current = delta;
			adjustCart(delta);

			formAction(formData);
		});
	};

	return {
		state,
		action,
		isPending: isTransitionPending || isActionPending,
	};
};
