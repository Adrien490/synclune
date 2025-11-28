"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { useActionState, useTransition } from "react";
import { refreshSkus } from "@/modules/skus/actions/refresh-skus";

interface UseRefreshSkusOptions {
	productId?: string;
	onSuccess?: () => void;
}

export function useRefreshSkus(options?: UseRefreshSkusOptions) {
	const [isTransitionPending, startTransition] = useTransition();

	const [state, action, isPending] = useActionState(
		withCallbacks(
			refreshSkus,
			createToastCallbacks({
				loadingMessage: "Rafraîchissement variantes...",
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
			if (options?.productId) {
				formData.append("productId", options.productId);
			}
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
