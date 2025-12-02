"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { bulkDeleteUsers } from "@/modules/users/actions/admin/bulk-delete-users";

interface UseBulkDeleteUsersOptions {
	onSuccess?: (message: string) => void;
}

export const useBulkDeleteUsers = (options?: UseBulkDeleteUsersOptions) => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			bulkDeleteUsers,
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
