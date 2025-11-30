"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { refreshOrders } from "@/modules/orders/actions/refresh-orders";

interface UseRefreshOrdersOptions {
	onSuccess?: () => void;
}

export function useRefreshOrders(options?: UseRefreshOrdersOptions) {
	const [isTransitionPending, startTransition] = useTransition();

	const [state, action, isPending] = useActionState(
		withCallbacks(
			refreshOrders,
			createToastCallbacks({
				showSuccessToast: false,
				onSuccess: () => {
					options?.onSuccess?.();
				},
			})
		),
		undefined
	);

	const refresh = () => {
		startTransition(() => {
			const formData = new FormData();
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		refresh,
	};
}
