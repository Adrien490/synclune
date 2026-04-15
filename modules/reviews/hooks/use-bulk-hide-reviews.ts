"use client";

import { useActionState } from "react";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { bulkHideReviews } from "../actions/bulk-hide-reviews";

interface UseBulkHideReviewsOptions {
	onSuccess?: () => void;
}

export function useBulkHideReviews(options?: UseBulkHideReviewsOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			bulkHideReviews,
			createToastCallbacks({
				loadingMessage: "Masquage en cours...",
				onSuccess: () => options?.onSuccess?.(),
			}),
		),
		undefined,
	);

	return { state, action, isPending };
}
