"use client";

import { useActionState } from "react";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { unsubscribeFromStockNotification } from "@/modules/stock-notifications/actions/unsubscribe-from-stock-notification";

export function useUnsubscribeFromStockNotification() {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			unsubscribeFromStockNotification,
			createToastCallbacks({
			})
		),
		undefined
	);

	return { state, action, isPending };
}
