"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { updateVariantStatus } from "@/modules/variants/actions/update-variant-status";

interface UseUpdateProductVariantStatusOptions {
	onSuccess?: (message: string) => void;
	onError?: () => void;
}

/**
 * Hook pour mettre à jour le statut actif/inactif d'un VARIANT
 * Utilise useActionState avec withCallbacks pour la gestion du toast
 */
export const useUpdateProductVariantStatus = (options?: UseUpdateProductVariantStatusOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateVariantStatus,
			createToastCallbacks({
				loadingMessage: "Mise à jour du statut…",
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

	// No startTransition here — callers wrap this in their own
	// startTransition alongside useOptimistic updates.
	const toggleStatus = (variantId: string, active: boolean) => {
		const formData = new FormData();
		formData.append("variantId", variantId);
		formData.append("active", String(active));
		action(formData);
	};

	return {
		state,
		isPending,
		toggleStatus,
	};
};
