"use client";

import { deleteOrder } from "@/modules/orders/actions/delete-order";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { useActionState } from "react";

export function useDeleteOrder() {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			deleteOrder,
			createToastCallbacks({
				loadingMessage: "Suppression en cours...",
			})
		),
		undefined
	);

	return { state, action, isPending };
}
