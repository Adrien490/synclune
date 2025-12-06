"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useRef, useTransition } from "react";
import { removeFromCart } from "@/modules/cart/actions/remove-from-cart";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";

interface UseRemoveFromCartOptions {
	/** Quantité de l'item à supprimer (pour optimistic UI du badge) */
	quantity?: number;
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour supprimer un article du panier
 * Compatible avec useActionState de React 19
 *
 * Inclut optimistic UI pour le badge navbar via useBadgeCountsStore
 */
export const useRemoveFromCart = (options?: UseRemoveFromCartOptions) => {
	// Store pour optimistic UI du badge navbar
	const adjustCart = useBadgeCountsStore((state) => state.adjustCart);

	// Ref pour stocker la quantité pending (pour rollback)
	const pendingQuantityRef = useRef<number>(0);

	const [isTransitionPending, startTransition] = useTransition();

	const [state, formAction, isActionPending] = useActionState(
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
				onError: () => {
					// Rollback du badge navbar
					adjustCart(pendingQuantityRef.current);
				},
			})
		),
		undefined
	);

	const action = (formData: FormData) => {
		startTransition(() => {
			// Utiliser la quantité passée en option (défaut 1)
			const quantity = options?.quantity ?? 1;
			pendingQuantityRef.current = quantity;

			// Mise à jour optimistic du badge navbar (on retire)
			adjustCart(-quantity);

			formAction(formData);
		});
	};

	return {
		state,
		action,
		isPending: isTransitionPending || isActionPending,
	};
};
