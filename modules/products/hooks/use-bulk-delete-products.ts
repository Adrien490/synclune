"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { bulkDeleteProducts } from "@/modules/products/actions/bulk-delete-products";

interface UseBulkDeleteProductsOptions {
	onSuccess?: (message: string) => void;
}

export const useBulkDeleteProducts = (
	options?: UseBulkDeleteProductsOptions
) => {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			bulkDeleteProducts,
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

	const deleteProducts = (productIds: string[]) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("productIds", JSON.stringify(productIds));
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		deleteProducts,
	};
};
