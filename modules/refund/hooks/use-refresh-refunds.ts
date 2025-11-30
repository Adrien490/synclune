"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { refreshRefunds } from "@/modules/refund/actions/refresh-refunds";

interface UseRefreshRefundsOptions {
	onSuccess?: () => void;
}

export function useRefreshRefunds(options?: UseRefreshRefundsOptions) {
	const [isTransitionPending, startTransition] = useTransition();

	const [state, action, isPending] = useActionState(
		withCallbacks(
			refreshRefunds,
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
