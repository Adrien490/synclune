"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { deleteUser } from "@/modules/users/actions/admin/delete-user";

interface UseDeleteUserOptions {
	onSuccess?: (message: string) => void;
}

export const useDeleteUser = (options?: UseDeleteUserOptions) => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			deleteUser,
			createToastCallbacks({
				loadingMessage: "Suppression de l'utilisateur...",
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
