"use client";

import { markAsReturned } from "@/modules/orders/actions/mark-as-returned";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";

export function useMarkAsReturned() {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			markAsReturned,
			createToastCallbacks({
				loadingMessage: "Marquage comme retourné...",
			})
		),
		undefined
	);

	return { state, action, isPending };
}
