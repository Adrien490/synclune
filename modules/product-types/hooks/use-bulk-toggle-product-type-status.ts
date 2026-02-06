"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { bulkToggleProductTypeStatus } from "@/modules/product-types/actions/bulk-toggle-product-type-status";

interface UseBulkToggleProductTypeStatusOptions {
	onSuccess?: (message: string) => void;
}

export const useBulkToggleProductTypeStatus = (
	options?: UseBulkToggleProductTypeStatusOptions
) => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			bulkToggleProductTypeStatus,
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

	const [isTransitionPending, startTransition] = useTransition();

	const handle = (productTypeIds: string[], isActive: boolean) => {
		const formData = new FormData();
		formData.append("ids", JSON.stringify(productTypeIds));
		formData.append("isActive", String(isActive));
		startTransition(() => {
			formAction(formData);
		});
	};

	return {
		state,
		action: formAction,
		isPending: isFormPending || isTransitionPending,
		handle,
	};
};
