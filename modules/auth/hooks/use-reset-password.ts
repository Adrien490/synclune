"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { resetPassword } from "../actions/reset-password";

interface UseResetPasswordOptions {
	onSuccess?: () => void;
}

export function useResetPassword(options?: UseResetPasswordOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			resetPassword,
			createToastCallbacks({
				showSuccessToast: false,
				showErrorToast: false,
				onSuccess: options?.onSuccess,
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
