"use client";

import { useActionState, useTransition } from "react";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { toggleCollectionStatus } from "@/modules/collections/actions/toggle-collection-status";
import type { CollectionStatus } from "@/app/generated/prisma/enums";

interface UseToggleCollectionStatusOptions {
	onSuccess?: (message: string) => void;
}

export const useToggleCollectionStatus = (options?: UseToggleCollectionStatusOptions) => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			toggleCollectionStatus,
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
			}),
		),
		undefined,
	);

	const [isTransitionPending, startTransition] = useTransition();

	const handle = (
		id: string,
		currentStatus: CollectionStatus,
		targetStatus?: "DRAFT" | "PUBLIC",
	) => {
		const formData = new FormData();
		formData.append("id", id);
		formData.append("currentStatus", currentStatus);
		if (targetStatus) {
			formData.append("targetStatus", targetStatus);
		}
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
