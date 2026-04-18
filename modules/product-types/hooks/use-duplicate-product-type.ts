"use client";

import { useActionState, useTransition } from "react";
import { duplicateProductType } from "@/modules/product-types/actions/duplicate-product-type";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

interface UseDuplicateProductTypeOptions {
	onSuccess?: (message: string) => void;
}

export const useDuplicateProductType = (options?: UseDuplicateProductTypeOptions) => {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			duplicateProductType,
			createToastCallbacks({
				loadingMessage: "Duplication du type...",
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
			}),
		),
		undefined,
	);

	const runDuplicate = (productTypeId: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("productTypeId", productTypeId);
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		duplicateProductType: runDuplicate,
	};
};
