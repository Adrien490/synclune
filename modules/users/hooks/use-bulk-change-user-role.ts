"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { bulkChangeUserRole } from "@/modules/users/actions/admin/bulk-change-user-role";
import { Role } from "@/app/generated/prisma";

interface UseBulkChangeUserRoleOptions {
	onSuccess?: (message: string) => void;
}

export const useBulkChangeUserRole = (options?: UseBulkChangeUserRoleOptions) => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			bulkChangeUserRole,
			createToastCallbacks({
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

	const handle = (userIds: string[], role: Role) => {
		const formData = new FormData();
		formData.append("ids", JSON.stringify(userIds));
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
