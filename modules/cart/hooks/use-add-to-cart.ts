"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { posthogEvents } from "@/shared/lib/posthog-events";
import { useActionState, useRef, useTransition } from "react";
import { addToCart } from "@/modules/cart/actions/add-to-cart";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import { useSheetStore } from "@/shared/providers/sheet-store-provider";
import type { ActionState } from "@/shared/types/server-action";

interface UseAddToCartOptions {
	onSuccess?: (message: string) => void;
	/** Ouvrir le cart sheet apres ajout reussi (defaut: true) */
	openSheetOnSuccess?: boolean;
	/** Product data for PostHog tracking */
	trackingData?: { productId: string; productName: string; price: number };
}

/**
 * Hook pour ajouter un article au panier
 * Compatible avec useActionState de React 19
 *
 * Sheet s'ouvre apres succes du server action.
 * Toast d'erreur uniquement en cas de probleme.
 */
export const useAddToCart = (options?: UseAddToCartOptions) => {
	// Store pour optimistic UI du badge navbar
	const adjustCart = useBadgeCountsStore((state) => state.adjustCart);

	// Store pour ouvrir le cart sheet
	const openSheet = useSheetStore((state) => state.open);
	const shouldOpenSheet = options?.openSheetOnSuccess ?? true;

	// Ref pour stocker la quantité en cours pour le rollback
	const pendingQuantityRef = useRef(1);

	const [isTransitionPending, startTransition] = useTransition();

	const [state, formAction, isActionPending] = useActionState(
		async (prev: ActionState | undefined, formData: FormData) =>
			withCallbacks(
				addToCart,
				createToastCallbacks({
					showSuccessToast: false,
					onSuccess: (result: unknown) => {
						if (shouldOpenSheet) {
							openSheet("cart");
						}
						if (options?.trackingData) {
							posthogEvents.addedToCart({
								id: options.trackingData.productId,
								name: options.trackingData.productName,
								price: options.trackingData.price,
								quantity: pendingQuantityRef.current,
							});
						}
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
						// Rollback du badge navbar avec la quantite reelle
						// Sheet ne s'ouvre PAS en cas d'erreur
						adjustCart(-pendingQuantityRef.current);
					},
				}),
			)(prev, formData),
		undefined,
	);

	const action = (formData: FormData) => {
		const quantity = Number(formData.get("quantity")) || 1;
		pendingQuantityRef.current = quantity;

		startTransition(() => {
			// Mise a jour optimistic du badge navbar avec la quantite reelle
			adjustCart(quantity);
			formAction(formData);
		});
	};

	return {
		state,
		action,
		isPending: isTransitionPending || isActionPending,
	};
};
