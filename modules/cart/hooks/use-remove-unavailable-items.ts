"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import { removeUnavailableItems } from "../actions/remove-unavailable-items";

interface UseRemoveUnavailableItemsOptions {
	/** Total quantity of items being removed (for optimistic badge update) */
	unavailableQuantity?: number;
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour retirer tous les articles indisponibles du panier
 * Compatible avec useActionState de React 19
 */
export const useRemoveUnavailableItems = (
	options?: UseRemoveUnavailableItemsOptions
) => {
	const adjustCart = useBadgeCountsStore((state) => state.adjustCart);

	const [state, action, isPending] = useActionState(
		withCallbacks(
			removeUnavailableItems,
			createToastCallbacks({
				onSuccess: (result: unknown) => {
					if (options?.unavailableQuantity) {
						adjustCart(-options.unavailableQuantity);
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
