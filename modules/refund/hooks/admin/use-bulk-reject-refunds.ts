"use client";

import { bulkRejectRefunds } from "@/modules/refund/actions/bulk-reject-refunds";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { useActionState, useTransition } from "react";

interface UseBulkRejectRefundsOptions {
	onSuccess?: (message: string) => void;
}

export function useBulkRejectRefunds(options?: UseBulkRejectRefundsOptions) {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			bulkRejectRefunds,
			createToastCallbacks({
				loadingMessage: "Rejet en cours...",
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

	const rejectRefunds = (refundIds: string[], reason?: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("ids", JSON.stringify(refundIds));
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
		rejectRefunds,
	};
}
