"use client";

import { markAsProcessing } from "@/modules/orders/actions/mark-as-processing";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";

export function useMarkAsProcessing() {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			markAsProcessing,
			createToastCallbacks({
				loadingMessage: "Passage en préparation...",
			})
		),
		undefined
	);

	return { state, action, isPending };
}
