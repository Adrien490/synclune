"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { useActionState, useTransition } from "react";
import { refreshNewsletter } from "@/modules/newsletter/actions/refresh-newsletter";

interface UseRefreshNewsletterOptions {
	onSuccess?: () => void;
}

export function useRefreshNewsletter(options?: UseRefreshNewsletterOptions) {
	const [isTransitionPending, startTransition] = useTransition();

	const [state, action, isPending] = useActionState(
		withCallbacks(
			refreshNewsletter,
			createToastCallbacks({
				loadingMessage: "Rafraîchissement newsletter...",
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
