"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { useActionState, useTransition } from "react";
import { refreshDiscounts } from "@/modules/discount/actions/refresh-discounts";

interface UseRefreshDiscountsOptions {
	onSuccess?: () => void;
}

export function useRefreshDiscounts(options?: UseRefreshDiscountsOptions) {
	const [isTransitionPending, startTransition] = useTransition();

	const [state, action, isPending] = useActionState(
		withCallbacks(
			refreshDiscounts,
			createToastCallbacks({
				loadingMessage: "Rafraîchissement codes promo...",
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
