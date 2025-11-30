"use client";

import { cancelOrder } from "@/modules/orders/actions/cancel-order";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";

interface UseCancelOrderOptions {
	onSuccess?: () => void;
}

export function useCancelOrder(options?: UseCancelOrderOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			cancelOrder,
			createToastCallbacks({
				onSuccess: () => options?.onSuccess?.(),
			})
		),
		undefined
	);

	return { state, action, isPending };
}
