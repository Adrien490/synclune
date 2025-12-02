"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { bulkChangeProductStatus } from "@/modules/products/actions/bulk-change-product-status";

interface UseBulkChangeProductStatusOptions {
	onSuccess?: (message: string) => void;
}

export const useBulkChangeProductStatus = (
	options?: UseBulkChangeProductStatusOptions
) => {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			bulkChangeProductStatus,
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

	const changeProductStatus = (
		productIds: string[],
		targetStatus: "DRAFT" | "PUBLIC"
	) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("productIds", JSON.stringify(productIds));
			formData.append("targetStatus", targetStatus);
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		changeProductStatus,
	};
};
