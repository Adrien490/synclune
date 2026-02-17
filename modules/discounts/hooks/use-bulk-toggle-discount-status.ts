"use client";

import { useActionState, useTransition } from "react";
import { bulkToggleDiscountStatus } from "@/modules/discounts/actions/bulk-toggle-discount-status";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

interface UseBulkToggleDiscountStatusOptions {
	onSuccess?: () => void;
}

/**
 * Hook pour activer/désactiver plusieurs codes promo en masse
 *
 * @example
 * ```tsx
 * const { action, isPending } = useBulkToggleDiscountStatus({
 *   onSuccess: () => clearSelection(),
 * });
 *
 * const handleToggle = (activate: boolean) => {
 *   const formData = new FormData();
 *   ids.forEach(id => formData.append("ids", id));
 *   formData.append("isActive", activate.toString());
 *   action(formData);
 * };
 * ```
 */
export function useBulkToggleDiscountStatus(
	options?: UseBulkToggleDiscountStatusOptions
) {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			bulkToggleDiscountStatus,
			createToastCallbacks({
				onSuccess: () => {
					options?.onSuccess?.();
				},
			})
		),
		undefined
	);

	const [isTransitionPending, startTransition] = useTransition();

	const toggle = (ids: string[], isActive: boolean) => {
		const formData = new FormData();
		ids.forEach((id) => formData.append("ids", id));
		formData.append("isActive", isActive.toString());
		startTransition(() => {
			formAction(formData);
		});
	};

	return {
		state,
		action: formAction,
		toggle,
		isPending: isFormPending || isTransitionPending,
	};
}
