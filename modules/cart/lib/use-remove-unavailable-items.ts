"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { removeUnavailableItems } from "./remove-unavailable-items";

interface UseRemoveUnavailableItemsOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour retirer tous les articles indisponibles du panier
 * Compatible avec useActionState de React 19
 */
export const useRemoveUnavailableItems = (
	options?: UseRemoveUnavailableItemsOptions
) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			removeUnavailableItems,
			createToastCallbacks({
				loadingMessage: "Suppression des articles indisponibles...",
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
