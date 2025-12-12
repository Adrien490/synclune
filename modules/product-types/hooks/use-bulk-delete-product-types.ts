"use client";

import { bulkDeleteProductTypes } from "@/modules/product-types/actions/bulk-delete-product-types";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";

interface UseBulkDeleteProductTypesOptions {
	onSuccess?: (message: string) => void;
}

export const useBulkDeleteProductTypes = (options?: UseBulkDeleteProductTypesOptions) => {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			bulkDeleteProductTypes,
			createToastCallbacks({
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

	const deleteProductTypes = (productTypeIds: string[]) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("ids", JSON.stringify(productTypeIds));
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		deleteProductTypes,
	};
};
