"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { requestPasswordReset } from "../actions/request-password-reset";

interface UseRequestPasswordResetOptions {
	onSuccess?: () => void;
}

export function useRequestPasswordReset(options?: UseRequestPasswordResetOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			requestPasswordReset,
			createToastCallbacks({
				loadingMessage: "Envoi du lien de réinitialisation...",
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
