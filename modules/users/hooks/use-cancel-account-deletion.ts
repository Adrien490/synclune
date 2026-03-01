"use client";

import { useActionState } from "react";
import { cancelAccountDeletion } from "@/modules/users/actions/cancel-account-deletion";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

export function useCancelAccountDeletion() {
	const [state, action, isPending] = useActionState(
		withCallbacks(cancelAccountDeletion, createToastCallbacks()),
		undefined,
	);

	return {
		state,
		action,
		isPending,
	};
}
