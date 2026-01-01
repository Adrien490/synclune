"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { signInEmail } from "../actions/sign-in-email";

interface UseSignInEmailOptions {
	onSuccess?: () => void;
}

export function useSignInEmail(options?: UseSignInEmailOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			signInEmail,
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
