"use client";

import { cancelOrder } from "@/modules/orders/actions/cancel-order";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { useActionState } from "react";

export function useCancelOrder() {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			cancelOrder,
			createToastCallbacks({
				loadingMessage: "Annulation en cours...",
			})
		),
		undefined
	);

	return { state, action, isPending };
}
