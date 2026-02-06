"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { toggleColorStatus } from "@/modules/colors/actions/toggle-color-status";

interface UseToggleColorStatusOptions {
	onSuccess?: (message: string) => void;
}

export const useToggleColorStatus = (
	options?: UseToggleColorStatusOptions
) => {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			toggleColorStatus,
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

	const toggleStatus = (colorId: string, isActive: boolean) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("id", colorId);
			formData.append("isActive", isActive.toString());
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		toggleStatus,
	};
};
