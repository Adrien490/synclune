"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { resendVerificationEmail } from "../actions/resend-verification-email";

interface UseResendVerificationEmailOptions {
	onSuccess?: () => void;
}

export function useResendVerificationEmail(options?: UseResendVerificationEmailOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			resendVerificationEmail,
			createToastCallbacks({
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
