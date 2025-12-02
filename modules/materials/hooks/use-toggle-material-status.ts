"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { toggleMaterialStatus } from "@/modules/materials/actions/toggle-material-status";

interface UseToggleMaterialStatusOptions {
	onSuccess?: (message: string) => void;
}

export const useToggleMaterialStatus = (
	options?: UseToggleMaterialStatusOptions
) => {
	const [isTransitionPending, startTransition] = useTransition();
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
			})
		),
		undefined
	);

	const toggleStatus = (materialId: string, isActive: boolean) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("id", materialId);
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
