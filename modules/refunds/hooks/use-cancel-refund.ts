"use client";

import { cancelRefund } from "@/modules/refunds/actions/cancel-refund";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";

interface UseCancelRefundOptions {
	onSuccess?: () => void;
}

export function useCancelRefund(options?: UseCancelRefundOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			cancelRefund,
			createToastCallbacks({
				onSuccess: () => options?.onSuccess?.(),
			})
		),
		undefined
	);

	return { state, action, isPending };
}
