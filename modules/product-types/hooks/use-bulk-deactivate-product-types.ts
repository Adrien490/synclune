"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { bulkDeactivateProductTypes } from "@/modules/product-types/actions/bulk-deactivate-product-types";

interface UseBulkDeactivateProductTypesOptions {
	onSuccess?: (message: string) => void;
}

export const useBulkDeactivateProductTypes = (
	options?: UseBulkDeactivateProductTypesOptions
) => {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			bulkDeactivateProductTypes,
			createToastCallbacks({
				loadingMessage: "Désactivation en cours...",
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

	const deactivateProductTypes = (productTypeIds: string[]) => {
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
		deactivateProductTypes,
	};
};
