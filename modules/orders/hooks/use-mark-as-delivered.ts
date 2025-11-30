"use client";

import { markAsDelivered } from "@/modules/orders/actions/mark-as-delivered";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";

interface UseMarkAsDeliveredOptions {
	onSuccess?: () => void;
}

export function useMarkAsDelivered(options?: UseMarkAsDeliveredOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			markAsDelivered,
			createToastCallbacks({
				onSuccess: () => options?.onSuccess?.(),
			})
		),
		undefined
	);

	return { state, action, isPending };
}
