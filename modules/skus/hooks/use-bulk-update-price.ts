"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { bulkUpdatePrice } from "@/modules/skus/actions/bulk-update-price";

interface UseBulkUpdatePriceOptions {
	onSuccess?: (message: string) => void;
}

export const useBulkUpdatePrice = (options?: UseBulkUpdatePriceOptions) => {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			bulkUpdatePrice,
			createToastCallbacks({
				loadingMessage: "Modification des prix en cours...",
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

	const updatePrice = (
		skuIds: string[],
		mode: "percentage" | "absolute",
		value: number,
		updateCompareAtPrice: boolean = false
	) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("ids", JSON.stringify(skuIds));
			formData.append("mode", mode);
			formData.append("value", value.toString());
			formData.append("updateCompareAtPrice", updateCompareAtPrice.toString());
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		updatePrice,
	};
};
