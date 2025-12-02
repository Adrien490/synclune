"use client";

import { bulkCancelOrders } from "@/modules/orders/actions/bulk-cancel-orders";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";

interface UseBulkCancelOrdersOptions {
	onSuccess?: (message: string) => void;
}

export function useBulkCancelOrders(options?: UseBulkCancelOrdersOptions) {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			bulkCancelOrders,
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

	const cancelOrders = (orderIds: string[], reason?: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("ids", JSON.stringify(orderIds));
			if (reason) {
				formData.append("reason", reason);
			}
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		cancelOrders,
	};
}
