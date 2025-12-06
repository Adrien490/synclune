"use client"

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks"
import { withCallbacks } from "@/shared/utils/with-callbacks"
import { useActionState } from "react"
import { deleteTestimonial } from "../actions/delete-testimonial"

interface UseDeleteTestimonialOptions {
	onSuccess?: (message: string) => void
}

/**
 * Hook pour supprimer un témoignage
 * Utilise useActionState avec withCallbacks pour la gestion du toast
 */
export function useDeleteTestimonial(options?: UseDeleteTestimonialOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			deleteTestimonial,
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

	return { state, action, isPending }
}
