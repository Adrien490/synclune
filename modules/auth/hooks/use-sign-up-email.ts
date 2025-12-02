"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { signUpEmail } from "../actions/sign-up-email";

interface UseSignUpEmailOptions {
	onSuccess?: (message: string) => void;
}

export function useSignUpEmail(options?: UseSignUpEmailOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			signUpEmail,
			createToastCallbacks({
				showSuccessToast: false,
				showErrorToast: false,
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"message" in result &&
						typeof result.message === "string"
					) {
						options?.onSuccess?.(result.message);
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
