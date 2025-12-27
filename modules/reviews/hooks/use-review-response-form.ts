"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import type { ActionState } from "@/shared/types/server-action"
import { ActionStatus } from "@/shared/types/server-action"
import { createReviewResponse } from "../actions/create-review-response"
import { updateReviewResponse } from "../actions/update-review-response"
import { deleteReviewResponse } from "../actions/delete-review-response"

interface UseReviewResponseFormOptions {
	onSuccess?: () => void
}

/**
 * Helper pour afficher les toasts selon le résultat de l'action
 */
function handleActionResult(result: ActionState, onSuccess?: () => void) {
	if (result.status === ActionStatus.SUCCESS) {
		toast.success(result.message)
		onSuccess?.()
	} else {
		toast.error(result.message)
	}
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
	const [isPending, startTransition] = useTransition()

	const createResponse = (reviewId: string, content: string) => {
		startTransition(async () => {
			const formData = new FormData()
			formData.append("reviewId", reviewId)
			formData.append("content", content)

			const result = await createReviewResponse(undefined, formData)
			handleActionResult(result, options?.onSuccess)
		})
	}

	const editResponse = (responseId: string, content: string) => {
		startTransition(async () => {
			const formData = new FormData()
			formData.append("id", responseId)
			formData.append("content", content)

			const result = await updateReviewResponse(undefined, formData)
			handleActionResult(result, options?.onSuccess)
		})
	}

	const removeResponse = (responseId: string) => {
		startTransition(async () => {
			const formData = new FormData()
			formData.append("id", responseId)

			const result = await deleteReviewResponse(undefined, formData)
			handleActionResult(result, options?.onSuccess)
		})
	}

	return {
		createResponse,
		editResponse,
		removeResponse,
		isPending,
	}
}
