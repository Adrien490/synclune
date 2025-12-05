"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useCallback, useRef, useTransition } from "react";
import { updateCartItem } from "@/modules/cart/actions/update-cart-item";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";

interface UseUpdateCartItemOptions {
	/** Quantité actuelle de l'item (pour calculer le delta) */
	currentQuantity?: number;
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour mettre à jour la quantité d'un article dans le panier
 * Compatible avec useActionState de React 19
 *
 * Inclut optimistic UI pour le badge navbar via useBadgeCountsStore
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
				onError: () => {
					// Rollback du badge navbar
					adjustCart(-pendingDeltaRef.current);
				},
			})
		),
		undefined
	);

	const action = useCallback(
		(formData: FormData) => {
			startTransition(() => {
				// Calculer le delta (nouvelle quantité - ancienne quantité)
				const newQuantity = Number(formData.get("quantity")) || 1;
				const currentQuantity = options?.currentQuantity ?? 1;
				const delta = newQuantity - currentQuantity;

				pendingDeltaRef.current = delta;

				// Mise à jour optimistic du badge navbar
				if (delta !== 0) {
					adjustCart(delta);
				}

				formAction(formData);
			});
		},
		[adjustCart, formAction, options?.currentQuantity]
	);

	return {
		state,
		action,
		isPending: isTransitionPending || isActionPending,
	};
};
