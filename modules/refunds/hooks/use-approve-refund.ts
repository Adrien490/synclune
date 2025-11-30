"use client";

import { approveRefund } from "@/modules/refunds/actions/approve-refund";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";

interface UseApproveRefundOptions {
	onSuccess?: () => void;
}

export function useApproveRefund(options?: UseApproveRefundOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			approveRefund,
			createToastCallbacks({
				onSuccess: () => options?.onSuccess?.(),
			})
		),
		undefined
	);

	return { state, action, isPending };
}
