"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { signInSocial } from "../actions/sign-in-social";

interface UseSignInSocialOptions {
	onSuccess?: () => void;
}

export function useSignInSocial(options?: UseSignInSocialOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			signInSocial,
			createToastCallbacks({
				showSuccessToast: false,
				showErrorToast: false,
				onSuccess: options?.onSuccess,
			})
		),
		undefined
	);

	return { state, action, isPending };
}
