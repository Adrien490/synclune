"use client";

import { useActionState } from "react";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { cancelCustomizationRequestCustomer } from "../actions/cancel-customization-request-customer";

interface UseCancelCustomizationRequestCustomerOptions {
	onSuccess?: () => void;
}

export function useCancelCustomizationRequestCustomer(
	options?: UseCancelCustomizationRequestCustomerOptions,
) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			cancelCustomizationRequestCustomer,
			createToastCallbacks({
				loadingMessage: "Annulation de la demande...",
				onSuccess: () => options?.onSuccess?.(),
			}),
		),
		undefined,
	);

	return { state, action, isPending };
}
