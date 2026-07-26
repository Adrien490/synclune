"use client";

import { useActionState, useState, useTransition } from "react";
import { createReviewResponse } from "../actions/create-review-response";
import { updateReviewResponse } from "../actions/update-review-response";
import { deleteReviewResponse } from "../actions/delete-review-response";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import type { ActionState } from "@/shared/types/server-action";

interface UseReviewResponseFormOptions {
	onSuccess?: () => void;
}

type ResponseAction = "create" | "edit" | "remove";

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
	const [lastAction, setLastAction] = useState<ResponseAction>("create");

	const callbacks = createToastCallbacks<ActionState>({
		loadingMessage: "Envoi de la réponse…",
		onSuccess: () => {
			options?.onSuccess?.();
		},
	});

	const [createState, createFormAction, isCreatePending] = useActionState(
		withCallbacks(createReviewResponse, callbacks),
		undefined,
	);

	const [editState, editFormAction, isEditPending] = useActionState(
		withCallbacks(updateReviewResponse, callbacks),
		undefined,
	);

	const [removeState, removeFormAction, isRemovePending] = useActionState(
		withCallbacks(deleteReviewResponse, callbacks),
		undefined,
	);

	const createResponse = (reviewId: string, content: string) => {
		setLastAction("create");
		startTransition(() => {
			const formData = new FormData();
			formData.append("reviewId", reviewId);
			formData.append("content", content);
			createFormAction(formData);
		});
	};

	const editResponse = (responseId: string, content: string) => {
		setLastAction("edit");
		startTransition(() => {
			const formData = new FormData();
			formData.append("id", responseId);
			formData.append("content", content);
			editFormAction(formData);
		});
	};

	const removeResponse = (responseId: string) => {
		setLastAction("remove");
		startTransition(() => {
			const formData = new FormData();
			formData.append("id", responseId);
			removeFormAction(formData);
		});
	};

	// État de la dernière action déclenchée — les VALIDATION_ERROR sont retirées du
	// toast par `createToastCallbacks`, le composant doit donc les rendre inline.
	// On ne peut pas faire un simple `??` : les trois états coexistent une fois
	// chacun invoqué, et un `??` renverrait un état périmé.
	const state =
		lastAction === "edit" ? editState : lastAction === "remove" ? removeState : createState;

	return {
		createResponse,
		editResponse,
		removeResponse,
		state,
		isPending: isPending || isCreatePending || isEditPending || isRemovePending,
	};
}
