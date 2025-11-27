"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { useActionState } from "react";
import { deleteProductType } from "@/modules/product-types/actions/delete-product-type";

interface UseDeleteProductTypeOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour supprimer un ProductType
 */
export const useDeleteProductType = (options?: UseDeleteProductTypeOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			deleteProductType,
			createToastCallbacks({
				loadingMessage: "Suppression en cours...",
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
