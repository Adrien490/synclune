"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { useActionState, useTransition } from "react";
import { suspendUser } from "@/modules/users/actions/admin/suspend-user";

interface UseSuspendUserOptions {
	onSuccess?: (message: string) => void;
}

export const useSuspendUser = (options?: UseSuspendUserOptions) => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			suspendUser,
			createToastCallbacks({
				loadingMessage: "Suspension de l'utilisateur...",
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

	const [isTransitionPending, startTransition] = useTransition();

	const handle = (userId: string) => {
		const formData = new FormData();
		formData.append("id", userId);
		startTransition(() => {
			formAction(formData);
		});
	};

	return {
		state,
		action: formAction,
		isPending: isFormPending || isTransitionPending,
		handle,
	};
};
