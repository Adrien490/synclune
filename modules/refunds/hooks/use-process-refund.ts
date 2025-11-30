"use client";

import { processRefund } from "@/modules/refunds/actions/process-refund";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";

export function useProcessRefund() {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			processRefund,
			createToastCallbacks({
				loadingMessage: "Traitement du remboursement...",
			})
		),
		undefined
	);

	return { state, action, isPending };
}
