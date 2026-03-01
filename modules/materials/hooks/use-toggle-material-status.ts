"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { toggleMaterialStatus } from "@/modules/materials/actions/toggle-material-status";

interface UseToggleMaterialStatusOptions {
	onSuccess?: (message: string) => void;
	onError?: () => void;
}

export const useToggleMaterialStatus = (options?: UseToggleMaterialStatusOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			toggleMaterialStatus,
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

	// No startTransition here — callers (e.g. MaterialActiveToggle) wrap
	// this in their own startTransition alongside useOptimistic updates,
	// ensuring the optimistic state persists until the action resolves.
	const toggleStatus = (materialId: string, isActive: boolean) => {
		const formData = new FormData();
		formData.append("id", materialId);
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
