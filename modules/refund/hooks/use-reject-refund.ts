"use client";

import { rejectRefund } from "@/modules/refund/actions/reject-refund";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";

export function useRejectRefund() {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			rejectRefund,
			createToastCallbacks({
				loadingMessage: "Rejet en cours...",
			})
		),
		undefined
	);

	return { state, action, isPending };
}
