"use client";

import { useActionState } from "react";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { bulkMarkAsShipped } from "../actions/bulk-mark-as-shipped";

interface UseBulkMarkAsShippedOptions {
	onSuccess?: () => void;
}

export function useBulkMarkAsShipped(options?: UseBulkMarkAsShippedOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			bulkMarkAsShipped,
			createToastCallbacks({
				loadingMessage: "Expédition en cours...",
				onSuccess: () => options?.onSuccess?.(),
			}),
		),
		undefined,
	);

	return { state, action, isPending };
}
