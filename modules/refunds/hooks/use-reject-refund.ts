"use client";

import { rejectRefund } from "@/modules/refunds/actions/reject-refund";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";

interface UseRejectRefundOptions {
	onSuccess?: () => void;
}

export function useRejectRefund(options?: UseRejectRefundOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			rejectRefund,
			createToastCallbacks({
				onSuccess: () => options?.onSuccess?.(),
			})
		),
		undefined
	);

	return { state, action, isPending };
}
