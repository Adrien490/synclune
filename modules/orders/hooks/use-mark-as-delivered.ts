"use client";

import { markAsDelivered } from "@/modules/orders/actions/mark-as-delivered";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";

export function useMarkAsDelivered() {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			markAsDelivered,
			createToastCallbacks({
				loadingMessage: "Mise à jour en cours...",
			})
		),
		undefined
	);

	return { state, action, isPending };
}
