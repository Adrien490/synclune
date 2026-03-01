"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { toggleColorStatus } from "@/modules/colors/actions/toggle-color-status";

interface UseToggleColorStatusOptions {
	onSuccess?: (message: string) => void;
	onError?: () => void;
}

export const useToggleColorStatus = (options?: UseToggleColorStatusOptions) => {
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
				onError: () => {
					options?.onError?.();
				},
			}),
		),
		undefined,
	);

	// No startTransition here — callers (e.g. ColorActiveToggle) wrap
	// this in their own startTransition alongside useOptimistic updates,
	// ensuring the optimistic state persists until the action resolves.
	const toggleStatus = (colorId: string, isActive: boolean) => {
		const formData = new FormData();
		formData.append("id", colorId);
		formData.append("isActive", isActive.toString());
		action(formData);
	};

	return {
		state,
		action,
		isPending,
		toggleStatus,
	};
};
