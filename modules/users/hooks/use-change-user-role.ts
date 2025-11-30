"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { changeUserRole } from "@/modules/users/actions/admin/change-user-role";
import { Role } from "@/app/generated/prisma/client";

interface UseChangeUserRoleOptions {
	onSuccess?: (message: string) => void;
}

export const useChangeUserRole = (options?: UseChangeUserRoleOptions) => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			changeUserRole,
			createToastCallbacks({
				loadingMessage: "Changement de role...",
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

	const handle = (userId: string, role: Role) => {
		const formData = new FormData();
		formData.append("id", userId);
		formData.append("role", role);
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
