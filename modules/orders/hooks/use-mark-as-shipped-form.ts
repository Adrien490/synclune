"use client";

import { markAsShipped } from "@/modules/orders/actions/mark-as-shipped";
import { useAppForm } from "@/shared/components/forms";
import type { Carrier } from "@/modules/orders/utils/carrier-detection";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { mergeForm, useStore, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";

interface UseMarkAsShippedFormOptions {
	orderId: string;
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour le formulaire de marquage comme expédié
 * Utilise TanStack Form avec Next.js App Router
 */
export const useMarkAsShippedForm = (options: UseMarkAsShippedFormOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			markAsShipped,
			createToastCallbacks({
				loadingMessage: "Expédition en cours...",
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"message" in result &&
						typeof result.message === "string"
					) {
						options.onSuccess?.(result.message);
					}
				},
			})
		),
		undefined
	);

	const form = useAppForm({
		defaultValues: {
			id: options.orderId,
			trackingNumber: "",
			trackingUrl: "",
			carrier: "colissimo" as Carrier,
			sendEmail: true,
		},
		transform: useTransform(
			(baseForm) => mergeForm(baseForm, (state as unknown) ?? {}),
			[state]
		),
	});

	const formErrors = useStore(form.store, (formState) => formState.errors);

	return {
		form,
		state,
		action,
		isPending,
		formErrors,
	};
};
