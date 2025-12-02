"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { bulkAdjustStock } from "@/modules/skus/actions/bulk-adjust-stock";

interface UseBulkAdjustStockOptions {
	onSuccess?: (message: string) => void;
}

export const useBulkAdjustStock = (options?: UseBulkAdjustStockOptions) => {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			bulkAdjustStock,
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

	const adjustStock = (
		skuIds: string[],
		mode: "relative" | "absolute",
		value: number
	) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("ids", JSON.stringify(skuIds));
			formData.append("mode", mode);
			formData.append("value", value.toString());
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		adjustStock,
	};
};
