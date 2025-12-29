"use client";

import { useActionState, useTransition } from "react";
import { createReviewResponse } from "../actions/create-review-response";
import { updateReviewResponse } from "../actions/update-review-response";
import { deleteReviewResponse } from "../actions/delete-review-response";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import type { ActionState } from "@/shared/types/server-action";

interface UseReviewResponseFormOptions {
	onSuccess?: () => void;
}

/**
 * Hook pour gérer les réponses admin aux avis
 *
 * Expose 3 actions:
 * - createResponse: Créer une nouvelle réponse
 * - editResponse: Modifier une réponse existante
 * - removeResponse: Supprimer une réponse
 */
export function useReviewResponseForm(options?: UseReviewResponseFormOptions) {
	const [isPending, startTransition] = useTransition();

	const callbacks = createToastCallbacks<ActionState>({
		onSuccess: () => {
			options?.onSuccess?.();
		},
	});

	const [, createFormAction, isCreatePending] = useActionState(
		withCallbacks(createReviewResponse, callbacks),
		undefined
	);

	const [, editFormAction, isEditPending] = useActionState(
		withCallbacks(updateReviewResponse, callbacks),
		undefined
	);

	const [, removeFormAction, isRemovePending] = useActionState(
		withCallbacks(deleteReviewResponse, callbacks),
		undefined
	);

	const createResponse = (reviewId: string, content: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("reviewId", reviewId);
			formData.append("content", content);
			createFormAction(formData);
		});
	};

	const editResponse = (responseId: string, content: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("id", responseId);
			formData.append("content", content);
			editFormAction(formData);
		});
	};

	const removeResponse = (responseId: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("id", responseId);
			removeFormAction(formData);
		});
	};

	return {
		createResponse,
		editResponse,
		removeResponse,
		isPending: isPending || isCreatePending || isEditPending || isRemovePending,
	};
}
