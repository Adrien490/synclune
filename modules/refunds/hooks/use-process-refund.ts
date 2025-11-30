"use client";

import { processRefund } from "@/modules/refunds/actions/process-refund";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";

interface UseProcessRefundOptions {
	onSuccess?: () => void;
}

export function useProcessRefund(options?: UseProcessRefundOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			processRefund,
			createToastCallbacks({
				onSuccess: () => options?.onSuccess?.(),
			})
		),
		undefined
	);

	return { state, action, isPending };
}
