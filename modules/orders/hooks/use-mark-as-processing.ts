"use client";

import { markAsProcessing } from "@/modules/orders/actions/mark-as-processing";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";

interface UseMarkAsProcessingOptions {
	onSuccess?: () => void;
}

export function useMarkAsProcessing(options?: UseMarkAsProcessingOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			markAsProcessing,
			createToastCallbacks({
				onSuccess: () => options?.onSuccess?.(),
			})
		),
		undefined
	);

	return { state, action, isPending };
}
