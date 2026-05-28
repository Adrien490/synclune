"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import { clearSensitiveCaches } from "@/shared/lib/serwist-client";
import { useActionState, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logout } from "../actions/logout";

interface UseLogoutOptions {
	onSuccess?: () => void;
}

export function useLogout(options?: UseLogoutOptions) {
	const router = useRouter();
	const [isTransitionPending, startTransition] = useTransition();
	const [optimisticIsLoggedOut, setOptimisticIsLoggedOut] = useOptimistic(false);

	const [state, formAction, isActionPending] = useActionState(
		withCallbacks(
			logout,
			createToastCallbacks({
				showSuccessToast: false,
				onSuccess: () => {
					// Reset badge counts (wishlist/cart) to prevent leak across users on shared devices
					// Also clears the PWA app badge via AppBadgeSync subscription
					useBadgeCountsStore.getState().reset();
					// Purge navigation caches so a previous user's cached pages are not
					// served on a shared device (PWA-AUDIT-010). Best-effort, non-blocking.
					void clearSensitiveCaches();
					options?.onSuccess?.();
					// Redirection après un court délai pour feedback visuel
					setTimeout(() => {
						router.push("/");
						router.refresh();
					}, 300);
				},
				onError: () => {
					// Rollback optimistic state — user is still logged in
					setOptimisticIsLoggedOut(false);
				},
			}),
		),
		undefined,
	);

	const action = (formData: FormData) => {
		startTransition(() => {
			setOptimisticIsLoggedOut(true);
			formAction(formData);
		});
	};

	return {
		state,
		action,
		isPending: isTransitionPending || isActionPending,
		isLoggedOut: optimisticIsLoggedOut,
	};
}
