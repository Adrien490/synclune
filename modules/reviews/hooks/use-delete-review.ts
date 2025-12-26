"use client"

import { useActionState, useTransition } from "react"
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks"
import { withCallbacks } from "@/shared/utils/with-callbacks"
import { deleteReview } from "../actions/delete-review"

interface UseDeleteReviewOptions {
	onSuccess?: (message: string) => void
}

/**
 * Hook pour supprimer un avis
 * Utilise useActionState avec withCallbacks pour la gestion du toast
 * et useTransition pour la méthode handle
 *
 * @example
 * ```tsx
 * const { state, action, isPending, handle } = useDeleteReview({
 *   onSuccess: () => {
 *     dialog.close()
 *   },
 * })
 *
 * // Utilisation avec un form
 * return <form action={action}>...</form>
 *
 * // Utilisation programmatique
 * return (
 *   <button onClick={() => handle(reviewId)} disabled={isPending}>
 *     Supprimer
 *   </button>
 * )
 * ```
 */
export const useDeleteReview = (options?: UseDeleteReviewOptions) => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			deleteReview,
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
	 * @param reviewId L'ID de l'avis à supprimer
	 */
	const handle = (reviewId: string) => {
		const formData = new FormData()
		formData.append("id", reviewId)
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
