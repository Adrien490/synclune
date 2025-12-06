"use client"

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks"
import { withCallbacks } from "@/shared/utils/with-callbacks"
import { useActionState, useTransition } from "react"
import { bulkTogglePublish } from "../actions/bulk-toggle-publish"

interface UseBulkTogglePublishOptions {
	onSuccess?: (message: string) => void
}

/**
 * Hook pour publier/dépublier plusieurs témoignages
 * Utilise useActionState avec withCallbacks pour la gestion du toast
 * et useTransition pour la méthode handle
 */
export function useBulkTogglePublish(options?: UseBulkTogglePublishOptions) {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			bulkTogglePublish,
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
	 * Méthode utilitaire pour publier plusieurs témoignages
	 * @param testimonialIds Les IDs des témoignages à publier
	 */
	const handlePublish = (testimonialIds: string[]) => {
		const formData = new FormData()
		formData.append("ids", JSON.stringify(testimonialIds))
		formData.append("isPublished", "true")
		startTransition(() => {
			formAction(formData)
		})
	}

	/**
	 * Méthode utilitaire pour dépublier plusieurs témoignages
	 * @param testimonialIds Les IDs des témoignages à dépublier
	 */
	const handleUnpublish = (testimonialIds: string[]) => {
		const formData = new FormData()
		formData.append("ids", JSON.stringify(testimonialIds))
		formData.append("isPublished", "false")
		startTransition(() => {
			formAction(formData)
		})
	}

	return {
		state,
		action: formAction,
		isPending: isFormPending || isTransitionPending,
		handlePublish,
		handleUnpublish,
	}
}
