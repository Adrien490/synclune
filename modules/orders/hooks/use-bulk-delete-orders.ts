"use client";

import { bulkDeleteOrders } from "@/modules/orders/actions/bulk-delete-orders";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";

interface UseBulkDeleteOrdersOptions {
	onSuccess?: (message: string) => void;
}

export function useBulkDeleteOrders(options?: UseBulkDeleteOrdersOptions) {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			bulkDeleteOrders,
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

	const deleteOrders = (orderIds: string[]) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("ids", JSON.stringify(orderIds));
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		deleteOrders,
	};
}
