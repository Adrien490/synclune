"use client";

import { cancelRefund } from "@/modules/refunds/actions/cancel-refund";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";

export function useCancelRefund() {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			cancelRefund,
			createToastCallbacks({
				loadingMessage: "Annulation en cours...",
			})
		),
		undefined
	);

	return { state, action, isPending };
}
