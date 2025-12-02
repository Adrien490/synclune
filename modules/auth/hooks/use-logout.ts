"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { logout } from "../actions/logout";

interface UseLogoutOptions {
	onSuccess?: () => void;
}

export function useLogout(options?: UseLogoutOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			logout,
			createToastCallbacks({
				showSuccessToast: false,
				onSuccess: options?.onSuccess,
			})
		),
		undefined
	);

	return { state, action, isPending };
}
