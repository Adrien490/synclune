"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { toggleProductStatus } from "@/modules/products/actions/toggle-product-status";

interface UseToggleProductStatusOptions {
	onSuccess?: (message: string) => void;
	onError?: () => void;
}

/**
 * Hook pour basculer le statut d'un produit (DRAFT ↔ PUBLIC ↔ ARCHIVED)
 * Utilise useActionState avec withCallbacks pour la gestion du toast
 *
 * @example
 * ```tsx
 * const { isPending, toggleStatus } = useToggleProductStatus({
 *   onSuccess: () => {
 *     dialog.close();
 *   },
 * });
 * ```
 */
export const useToggleProductStatus = (options?: UseToggleProductStatusOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			toggleProductStatus,
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

	const toggleStatus = (
		productId: string,
		currentStatus: "DRAFT" | "PUBLIC" | "ARCHIVED",
		targetStatus?: "DRAFT" | "PUBLIC" | "ARCHIVED",
	) => {
		const formData = new FormData();
		formData.append("productId", productId);
		formData.append("currentStatus", currentStatus);
		if (targetStatus) {
			formData.append("targetStatus", targetStatus);
		}
		action(formData);
	};

	return {
		state,
		action,
		isPending,
		toggleStatus,
	};
};
