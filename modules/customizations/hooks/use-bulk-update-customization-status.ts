"use client";

import { useActionState } from "react";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { bulkUpdateCustomizationStatus } from "../actions/bulk-update-customization-status";

interface UseBulkUpdateCustomizationStatusOptions {
	onSuccess?: () => void;
}

export function useBulkUpdateCustomizationStatus(
	options?: UseBulkUpdateCustomizationStatusOptions
) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			bulkUpdateCustomizationStatus,
			createToastCallbacks({
				loadingMessage: "Mise à jour en cours...",
				onSuccess: () => options?.onSuccess?.(),
			})
		),
		undefined
	);

	return { state, action, isPending };
}
