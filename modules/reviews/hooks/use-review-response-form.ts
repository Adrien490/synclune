"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { createReviewResponse } from "../actions/create-review-response"
import { updateReviewResponse } from "../actions/update-review-response"
import { deleteReviewResponse } from "../actions/delete-review-response"

interface UseReviewResponseFormOptions {
	onSuccess?: () => void
}

/**
 * Hook pour gérer les réponses admin aux avis
 */
export function useReviewResponseForm(options?: UseReviewResponseFormOptions) {
	const [isPending, startTransition] = useTransition()
	const [content, setContent] = useState("")

	const createResponse = (reviewId: string, responseContent: string) => {
		startTransition(async () => {
			const formData = new FormData()
			formData.append("reviewId", reviewId)
			formData.append("content", responseContent)

			const result = await createReviewResponse(undefined, formData)

			if (result && "error" in result && typeof result.error === "string") {
				toast.error(result.error)
			} else if (result && "message" in result && typeof result.message === "string") {
				toast.success(result.message)
				setContent("")
				options?.onSuccess?.()
			}
		})
	}

	const editResponse = (responseId: string, responseContent: string) => {
		startTransition(async () => {
			const formData = new FormData()
			formData.append("id", responseId)
			formData.append("content", responseContent)

			const result = await updateReviewResponse(undefined, formData)

			if (result && "error" in result && typeof result.error === "string") {
				toast.error(result.error)
			} else if (result && "message" in result && typeof result.message === "string") {
				toast.success(result.message)
				options?.onSuccess?.()
			}
		})
	}

	const removeResponse = (responseId: string) => {
		startTransition(async () => {
			const formData = new FormData()
			formData.append("id", responseId)

			const result = await deleteReviewResponse(undefined, formData)

			if (result && "error" in result && typeof result.error === "string") {
				toast.error(result.error)
			} else if (result && "message" in result && typeof result.message === "string") {
				toast.success(result.message)
				options?.onSuccess?.()
			}
		})
	}

	return {
		content,
		setContent,
		createResponse,
		editResponse,
		removeResponse,
		isPending,
	}
}
