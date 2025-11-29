"use client";

import { bulkMarkAsDelivered } from "@/modules/orders/actions/bulk-mark-as-delivered";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { useActionState, useTransition } from "react";

interface UseBulkMarkAsDeliveredOptions {
	onSuccess?: (message: string) => void;
}

export function useBulkMarkAsDelivered(options?: UseBulkMarkAsDeliveredOptions) {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			bulkMarkAsDelivered,
			createToastCallbacks({
				loadingMessage: "Mise à jour en cours...",
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

	const markAsDelivered = (orderIds: string[]) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("ids", JSON.stringify(orderIds));
			formData.append("sendEmail", "false");
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		markAsDelivered,
	};
}
