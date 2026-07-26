"use client";

import { refreshReviews } from "@/modules/reviews/actions/refresh-reviews";
import { useRefreshAction } from "@/shared/hooks/use-action-with-toast";

interface UseRefreshReviewsOptions {
	onSuccess?: () => void;
}

export function useRefreshReviews(options?: UseRefreshReviewsOptions) {
	return useRefreshAction(refreshReviews, {
		onSuccess: options?.onSuccess,
	});
}
