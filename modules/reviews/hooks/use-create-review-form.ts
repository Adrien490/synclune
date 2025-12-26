"use client"

import { useAppForm } from "@/shared/components/forms"
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks"
import { withCallbacks } from "@/shared/utils/with-callbacks"
import { mergeForm, useStore, useTransform } from "@tanstack/react-form-nextjs"
import { useActionState } from "react"
import { createReview } from "@/modules/reviews/actions/create-review"

interface UseCreateReviewFormOptions {
	productId: string
	orderItemId: string
	onSuccess?: (message: string) => void
}

/**
 * Hook pour le formulaire de création d'avis
 * Utilise TanStack Form avec Next.js App Router
 */
export const useCreateReviewForm = (options: UseCreateReviewFormOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			createReview,
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
			productId: options.productId,
			orderItemId: options.orderItemId,
			rating: 5,
			title: "",
			content: "",
			media: [] as Array<{ url: string; blurDataUrl?: string; altText?: string }>,
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
