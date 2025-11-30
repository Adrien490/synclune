"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { bulkDeleteSkus } from "@/modules/skus/actions/bulk-delete-skus";

interface UseBulkDeleteSkusOptions {
	onSuccess?: (message: string) => void;
}

export const useBulkDeleteSkus = (options?: UseBulkDeleteSkusOptions) => {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			bulkDeleteSkus,
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

	const deleteSkus = (skuIds: string[]) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("ids", JSON.stringify(skuIds));
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		deleteSkus,
	};
};
