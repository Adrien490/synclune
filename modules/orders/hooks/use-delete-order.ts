"use client";

import { deleteOrder } from "@/modules/orders/actions/delete-order";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";

interface UseDeleteOrderOptions {
	onSuccess?: () => void;
}

export function useDeleteOrder(options?: UseDeleteOrderOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			deleteOrder,
			createToastCallbacks({
				onSuccess: () => options?.onSuccess?.(),
			})
		),
		undefined
	);

	return { state, action, isPending };
}
