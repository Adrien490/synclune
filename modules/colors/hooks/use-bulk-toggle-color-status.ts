"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { bulkToggleColorStatus } from "@/modules/colors/actions/bulk-toggle-color-status";

interface UseBulkToggleColorStatusOptions {
	onSuccess?: (message: string) => void;
}

export const useBulkToggleColorStatus = (options?: UseBulkToggleColorStatusOptions) => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			bulkToggleColorStatus,
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

	const handle = (colorIds: string[], isActive: boolean) => {
		const formData = new FormData();
		formData.append("ids", JSON.stringify(colorIds));
		formData.append("isActive", String(isActive));
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
