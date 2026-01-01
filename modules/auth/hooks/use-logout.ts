"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
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
				showErrorToast: false,
				onSuccess: () => {
					options?.onSuccess?.();
					// Redirection après un court délai pour feedback visuel
					setTimeout(() => {
						router.push("/");
						router.refresh();
					}, 300);
				},
			})
		),
		undefined
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
