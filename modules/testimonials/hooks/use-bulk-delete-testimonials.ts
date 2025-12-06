"use client"

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks"
import { withCallbacks } from "@/shared/utils/with-callbacks"
import { useActionState, useTransition } from "react"
import { bulkDeleteTestimonials } from "../actions/bulk-delete-testimonials"

interface UseBulkDeleteTestimonialsOptions {
	onSuccess?: (message: string) => void
}

/**
 * Hook pour supprimer plusieurs témoignages
 * Utilise useActionState avec withCallbacks pour la gestion du toast
 * et useTransition pour la méthode handle
 */
export function useBulkDeleteTestimonials(
	options?: UseBulkDeleteTestimonialsOptions
) {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			bulkDeleteTestimonials,
			createToastCallbacks({
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"message" in result &&
						typeof result.message === "string"
					) {
						options?.onSuccess?.(result.message)
					}
				},
			})
		),
		undefined
	)

	const [isTransitionPending, startTransition] = useTransition()

	/**
	 * Méthode utilitaire pour appeler l'action programmatiquement
	 * @param testimonialIds Les IDs des témoignages à supprimer
	 */
	const handle = (testimonialIds: string[]) => {
		const formData = new FormData()
		formData.append("ids", JSON.stringify(testimonialIds))
		startTransition(() => {
			formAction(formData)
		})
	}

	return {
		state,
		action: formAction,
		isPending: isFormPending || isTransitionPending,
		handle,
	}
}
