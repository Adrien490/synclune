"use client";

import { markAsPaid } from "@/modules/orders/actions/mark-as-paid";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";

interface UseMarkAsPaidOptions {
	onSuccess?: () => void;
}

export function useMarkAsPaid(options?: UseMarkAsPaidOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			markAsPaid,
			createToastCallbacks({
				onSuccess: () => options?.onSuccess?.(),
			})
		),
		undefined
	);

	return { state, action, isPending };
}
