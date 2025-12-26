"use client"

import { useAppForm } from "@/shared/components/forms"
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks"
import { withCallbacks } from "@/shared/utils/with-callbacks"
import { mergeForm, useStore, useTransform } from "@tanstack/react-form-nextjs"
import { useActionState } from "react"
import { updateReview } from "@/modules/reviews/actions/update-review"

interface UseUpdateReviewFormOptions {
	reviewId: string
	initialRating: number
	initialTitle: string
	initialContent: string
	initialMedia: Array<{ url: string; blurDataUrl?: string; altText?: string }>
	onSuccess?: (message: string) => void
}

/**
 * Hook pour le formulaire de modification d'avis
 * Utilise TanStack Form avec Next.js App Router
 */
export const useUpdateReviewForm = (options: UseUpdateReviewFormOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateReview,
			createToastCallbacks({
				showSuccessToast: true,
				showErrorToast: true,
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"message" in result &&
						typeof result.message === "string"
					) {
						options.onSuccess?.(result.message)
					}
				},
			})
		),
		undefined
	)

	const form = useAppForm({
		defaultValues: {
			reviewId: options.reviewId,
			rating: options.initialRating,
			title: options.initialTitle,
			content: options.initialContent,
			media: options.initialMedia,
		},
		// Merge server state with form state for validation errors
		transform: useTransform(
			(baseForm) => mergeForm(baseForm, (state as unknown) ?? {}),
			[state]
		),
	})

	// Subscribe to form errors for display
	const formErrors = useStore(form.store, (formState) => formState.errors)

	return {
		form,
		state,
		action,
		isPending,
		formErrors,
	}
}
