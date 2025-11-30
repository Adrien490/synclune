"use client";

import { approveRefund } from "@/modules/refunds/actions/approve-refund";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";

export function useApproveRefund() {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			approveRefund,
			createToastCallbacks({
				loadingMessage: "Approbation en cours...",
			})
		),
		undefined
	);

	return { state, action, isPending };
}
