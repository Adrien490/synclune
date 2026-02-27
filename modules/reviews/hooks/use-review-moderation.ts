"use client";

import { useActionState, useTransition } from "react";
import { moderateReview } from "../actions/moderate-review";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

interface UseReviewModerationOptions {
	onSuccess?: () => void;
}

/**
 * Hook pour les actions de modération d'un avis
 */
export function useReviewModeration(options?: UseReviewModerationOptions) {
	const [isPending, startTransition] = useTransition();

	const [, formAction, isActionPending] = useActionState(
		withCallbacks(
			moderateReview,
			createToastCallbacks({
				onSuccess: () => {
					options?.onSuccess?.();
				},
			}),
		),
		undefined,
	);

	const toggleStatus = (reviewId: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("id", reviewId);
			formAction(formData);
		});
	};

	return {
		toggleStatus,
		isPending: isPending || isActionPending,
	};
}
