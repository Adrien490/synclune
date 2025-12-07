"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useRef, useTransition } from "react";
import { addToCart } from "@/modules/cart/actions/add-to-cart";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import { useSheetStore } from "@/shared/providers/sheet-store-provider";

interface UseAddToCartOptions {
	onSuccess?: (message: string) => void;
	/** Ouvrir le cart sheet apres ajout reussi (defaut: true) */
	openSheetOnSuccess?: boolean;
}

/**
 * Hook pour ajouter un article au panier
 * Compatible avec useActionState de React 19
 *
 * Pas de toast de succès (optimistic UI via badge suffit).
 * Toast d'erreur uniquement en cas de problème.
 */
export const useAddToCart = (options?: UseAddToCartOptions) => {
	// Store pour optimistic UI du badge navbar
	const adjustCart = useBadgeCountsStore((state) => state.adjustCart);

	// Store pour ouvrir le cart sheet
	const openSheet = useSheetStore((state) => state.open);
	const shouldOpenSheet = options?.openSheetOnSuccess ?? true;

	// Ref pour stocker la quantité pending (pour rollback)
	const pendingQuantityRef = useRef<number>(0);

	const [isTransitionPending, startTransition] = useTransition();

	const [state, formAction, isActionPending] = useActionState(
		withCallbacks(
			addToCart,
			createToastCallbacks({
				showSuccessToast: false,
				onSuccess: (result: unknown) => {
					// Ouvrir le cart sheet apres ajout reussi
					if (shouldOpenSheet) {
						openSheet("cart");
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
					// Rollback du badge navbar
					adjustCart(-pendingQuantityRef.current);
				},
			})
		),
		undefined
	);

	const action = (formData: FormData) => {
		startTransition(() => {
			// Extraire la quantité pour l'optimistic update
			const quantity = Number(formData.get("quantity")) || 1;
			pendingQuantityRef.current = quantity;

			// Mise à jour optimistic du badge navbar
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
