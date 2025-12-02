"use client";

import { useActionState } from "react";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { cancelStockNotification } from "@/modules/stock-notifications/actions/unsubscribe-from-stock-notification";

export function useCancelStockNotification() {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			cancelStockNotification,
			createToastCallbacks({
			})
		),
		undefined
	);

	return { state, action, isPending };
}
