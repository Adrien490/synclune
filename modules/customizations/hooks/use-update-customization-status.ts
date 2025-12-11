"use client";

import { useActionState } from "react";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { updateCustomizationStatus } from "../actions/update-customization-status";

interface UseUpdateCustomizationStatusOptions {
	onSuccess?: () => void;
}

export function useUpdateCustomizationStatus(
	options?: UseUpdateCustomizationStatusOptions
) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateCustomizationStatus,
			createToastCallbacks({
				loadingMessage: "Mise à jour du statut...",
				onSuccess: () => options?.onSuccess?.(),
			})
		),
		undefined
	);

	return { state, action, isPending };
}
