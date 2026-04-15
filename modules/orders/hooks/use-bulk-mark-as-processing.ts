"use client";

import { useActionState } from "react";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { bulkMarkAsProcessing } from "../actions/bulk-mark-as-processing";

interface UseBulkMarkAsProcessingOptions {
	onSuccess?: () => void;
}

export function useBulkMarkAsProcessing(options?: UseBulkMarkAsProcessingOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			bulkMarkAsProcessing,
			createToastCallbacks({
				loadingMessage: "Mise à jour en cours...",
				onSuccess: () => options?.onSuccess?.(),
			}),
		),
		undefined,
	);

	return { state, action, isPending };
}
