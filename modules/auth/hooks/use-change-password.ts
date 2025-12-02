"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { changePassword } from "../actions/change-password";

interface UseChangePasswordOptions {
	onSuccess?: () => void;
	onOpenChange?: (open: boolean) => void;
}

export function useChangePassword(options?: UseChangePasswordOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			changePassword,
			createToastCallbacks({
				onSuccess: () => {
					options?.onSuccess?.();
					if (options?.onOpenChange) {
						setTimeout(() => {
							options.onOpenChange?.(false);
						}, 2000);
					}
				},
			})
		),
		undefined
	);

	return {
		state,
		action,
		isPending,
	};
}
