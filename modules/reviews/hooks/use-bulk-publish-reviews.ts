"use client";

import { useActionState } from "react";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { bulkPublishReviews } from "../actions/bulk-publish-reviews";

interface UseBulkPublishReviewsOptions {
	onSuccess?: () => void;
}

export function useBulkPublishReviews(options?: UseBulkPublishReviewsOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			bulkPublishReviews,
			createToastCallbacks({
				loadingMessage: "Publication en cours...",
				onSuccess: () => options?.onSuccess?.(),
			}),
		),
		undefined,
	);

	return { state, action, isPending };
}
