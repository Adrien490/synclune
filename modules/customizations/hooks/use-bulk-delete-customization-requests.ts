"use client";

import { useActionState } from "react";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { bulkDeleteCustomizationRequests } from "../actions/bulk-delete-customization-requests";

interface UseBulkDeleteCustomizationRequestsOptions {
	onSuccess?: () => void;
}

export function useBulkDeleteCustomizationRequests(
	options?: UseBulkDeleteCustomizationRequestsOptions,
) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			bulkDeleteCustomizationRequests,
			createToastCallbacks({
				loadingMessage: "Suppression en cours...",
				onSuccess: () => options?.onSuccess?.(),
			}),
		),
		undefined,
	);

	return { state, action, isPending };
}
