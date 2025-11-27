"use client";

import { cancelRefund } from "@/modules/refund/actions/cancel-refund";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
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
