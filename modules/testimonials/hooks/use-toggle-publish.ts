"use client"

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks"
import { withCallbacks } from "@/shared/utils/with-callbacks"
import { useActionState } from "react"
import { toggleTestimonialPublish } from "../actions/toggle-publish"

interface UseTogglePublishOptions {
	onSuccess?: (message: string) => void
}

/**
 * Hook pour publier/dépublier un témoignage
 * Utilise useActionState avec withCallbacks pour la gestion du toast
 */
export function useTogglePublish(options?: UseTogglePublishOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			toggleTestimonialPublish,
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
