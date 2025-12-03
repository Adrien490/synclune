"use client";

import { updateTracking } from "@/modules/orders/actions/update-tracking";
import { useAppForm } from "@/shared/components/tanstack-form";
import type { Carrier } from "@/modules/orders/utils/carrier-detection";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { mergeForm, useStore, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";

interface UseUpdateTrackingFormOptions {
	orderId: string;
	initialTrackingNumber?: string;
	initialTrackingUrl?: string;
	initialCarrier?: Carrier;
	initialEstimatedDelivery?: Date;
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour le formulaire de mise à jour du tracking
 * Utilise TanStack Form avec Next.js App Router
 */
export const useUpdateTrackingForm = (options: UseUpdateTrackingFormOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateTracking,
			createToastCallbacks({
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
			trackingNumber: options.initialTrackingNumber || "",
			trackingUrl: options.initialTrackingUrl || "",
			carrier: options.initialCarrier || ("colissimo" as Carrier),
			estimatedDelivery: options.initialEstimatedDelivery
				? options.initialEstimatedDelivery.toISOString().split("T")[0]
				: "",
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
