"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { bulkRestoreUsers } from "@/modules/users/actions/admin/bulk-restore-users";

interface UseBulkRestoreUsersOptions {
	onSuccess?: (message: string) => void;
}

export const useBulkRestoreUsers = (options?: UseBulkRestoreUsersOptions) => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			bulkRestoreUsers,
			createToastCallbacks({
				loadingMessage: "Restauration des utilisateurs...",
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
