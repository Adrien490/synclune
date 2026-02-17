"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { bulkDeleteDiscounts } from "@/modules/discounts/actions/bulk-delete-discounts";

interface UseBulkDeleteDiscountsOptions {
	onSuccess?: (message: string) => void;
}

export const useBulkDeleteDiscounts = (
	options?: UseBulkDeleteDiscountsOptions
) => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			bulkDeleteDiscounts,
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

	const handle = (discountIds: string[]) => {
		const formData = new FormData();
		discountIds.forEach((id) => formData.append("ids", id));
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
