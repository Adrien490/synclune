"use client";

import { markAsPaid } from "@/modules/orders/actions/mark-as-paid";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { useActionState } from "react";

export function useMarkAsPaid() {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			markAsPaid,
			createToastCallbacks({
				loadingMessage: "Marquage en cours...",
			})
		),
		undefined
	);

	return { state, action, isPending };
}
