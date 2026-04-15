"use client";

import { useActionState } from "react";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { bulkDeleteReviews } from "../actions/bulk-delete-reviews";

interface UseBulkDeleteReviewsOptions {
	onSuccess?: () => void;
}

export function useBulkDeleteReviews(options?: UseBulkDeleteReviewsOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			bulkDeleteReviews,
			createToastCallbacks({
				loadingMessage: "Suppression en cours...",
				onSuccess: () => options?.onSuccess?.(),
			}),
		),
		undefined,
	);

	return { state, action, isPending };
}
