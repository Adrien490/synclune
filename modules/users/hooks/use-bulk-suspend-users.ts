"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { bulkSuspendUsers } from "@/modules/users/actions/admin/bulk-suspend-users";

interface UseBulkSuspendUsersOptions {
	onSuccess?: (message: string) => void;
}

export const useBulkSuspendUsers = (options?: UseBulkSuspendUsersOptions) => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			bulkSuspendUsers,
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

	const handle = (userIds: string[]) => {
		const formData = new FormData();
		formData.append("ids", JSON.stringify(userIds));
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
