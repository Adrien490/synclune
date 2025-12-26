"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { moderateReview } from "../actions/moderate-review"

interface UseReviewModerationOptions {
	onSuccess?: () => void
}

/**
 * Hook pour les actions de modération d'un avis
 */
export function useReviewModeration(options?: UseReviewModerationOptions) {
	const [isPending, startTransition] = useTransition()

	const toggleStatus = (reviewId: string) => {
		startTransition(async () => {
			const formData = new FormData()
			formData.append("id", reviewId)

			const result = await moderateReview(undefined, formData)

			if (result && "error" in result && typeof result.error === "string") {
				toast.error(result.error)
			} else if (result && "message" in result && typeof result.message === "string") {
				toast.success(result.message)
				options?.onSuccess?.()
			}
		})
	}

	return {
		toggleStatus,
		isPending,
	}
}
