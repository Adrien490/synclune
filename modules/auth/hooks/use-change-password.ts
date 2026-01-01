"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { changePassword } from "../actions/change-password";
import { NOTIFICATION_AUTO_DISMISS_DELAY_MS } from "@/shared/constants/ui-delays";

interface UseChangePasswordOptions {
	onSuccess?: () => void;
	onOpenChange?: (open: boolean) => void;
}

export function useChangePassword(options?: UseChangePasswordOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			changePassword,
			createToastCallbacks({
				showSuccessToast: false,
				showErrorToast: false,
				onSuccess: () => {
					options?.onSuccess?.();
					if (options?.onOpenChange) {
						setTimeout(() => {
							options.onOpenChange?.(false);
						}, NOTIFICATION_AUTO_DISMISS_DELAY_MS);
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
