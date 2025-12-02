"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { duplicateProduct } from "@/modules/products/actions/duplicate-product";

interface UseDuplicateProductOptions {
	onSuccess?: (message: string) => void;
}

export const useDuplicateProduct = (options?: UseDuplicateProductOptions) => {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			duplicateProduct,
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

	const doDuplicate = (productId: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("productId", productId);
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		doDuplicate,
	};
};
