"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { useActionState, useTransition } from "react";
import { restoreUser } from "@/modules/users/actions/admin/restore-user";

interface UseRestoreUserOptions {
	onSuccess?: (message: string) => void;
}

export const useRestoreUser = (options?: UseRestoreUserOptions) => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			restoreUser,
			createToastCallbacks({
				loadingMessage: "Restauration de l'utilisateur...",
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
