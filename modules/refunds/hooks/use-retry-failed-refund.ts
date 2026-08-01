"use client";

import { retryFailedRefund } from "@/modules/refunds/actions/retry-failed-refund";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";

interface UseRetryFailedRefundOptions {
	onSuccess?: () => void;
}

export function useRetryFailedRefund(options?: UseRetryFailedRefundOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			retryFailedRefund,
			createToastCallbacks({
				loadingMessage: "Relance du remboursement…",
				onSuccess: () => options?.onSuccess?.(),
			}),
		),
		undefined,
	);

	return { state, action, isPending };
}
