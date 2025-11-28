"use client";

import { revertToProcessing } from "@/modules/orders/actions/revert-to-processing";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { useActionState } from "react";

export function useRevertToProcessing() {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			revertToProcessing,
			createToastCallbacks({
				loadingMessage: "Annulation de l'expédition...",
			})
		),
		undefined
	);

	return { state, action, isPending };
}
