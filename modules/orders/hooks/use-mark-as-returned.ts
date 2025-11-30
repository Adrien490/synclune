"use client";

import { markAsReturned } from "@/modules/orders/actions/mark-as-returned";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";

interface UseMarkAsReturnedOptions {
	onSuccess?: () => void;
}

export function useMarkAsReturned(options?: UseMarkAsReturnedOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			markAsReturned,
			createToastCallbacks({
				onSuccess: () => options?.onSuccess?.(),
			})
		),
		undefined
	);

	return { state, action, isPending };
}
