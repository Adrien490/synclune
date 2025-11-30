"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { refreshPayments } from "@/modules/payments/actions/refresh-payments";

interface UseRefreshPaymentsOptions {
	onSuccess?: () => void;
}

export function useRefreshPayments(options?: UseRefreshPaymentsOptions) {
	const [isTransitionPending, startTransition] = useTransition();

	const [state, action, isPending] = useActionState(
		withCallbacks(
			refreshPayments,
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
