"use client";

import { useActionState } from "react";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { notifyStockAvailableAction } from "@/modules/stock-notifications/actions/notify-stock-available";

export function useNotifyStockAvailable() {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			notifyStockAvailableAction,
			createToastCallbacks({
				loadingMessage: "Envoi des notifications...",
			})
		),
		undefined
	);

	return { state, action, isPending };
}
