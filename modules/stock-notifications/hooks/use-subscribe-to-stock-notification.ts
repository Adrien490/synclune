"use client";

import { useActionState } from "react";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { subscribeToStockNotification } from "@/modules/stock-notifications/actions/subscribe-to-stock-notification";

export function useSubscribeToStockNotification() {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			subscribeToStockNotification,
			createToastCallbacks({
				loadingMessage: "Inscription en cours...",
			})
		),
		undefined
	);

	return { state, action, isPending };
}
