"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { refreshCollections } from "@/modules/collections/actions/refresh-collections";

interface UseRefreshCollectionsOptions {
	onSuccess?: () => void;
}

/**
 * Hook pour rafraîchir les collections
 */
export function useRefreshCollections(options?: UseRefreshCollectionsOptions) {
	const [isTransitionPending, startTransition] = useTransition();

	const [state, action, isPending] = useActionState(
		withCallbacks(
			refreshCollections,
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
