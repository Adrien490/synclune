'use client'

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks"
import { withCallbacks } from "@/shared/utils/with-callbacks"
import { useActionState, useTransition } from 'react'
import { addToWishlist } from "@/modules/wishlist/actions/add-to-wishlist"
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store"

interface UseAddToWishlistOptions {
	onSuccess?: (message: string) => void
}

/**
 * Hook pour ajouter un article à la wishlist
 * Compatible avec useActionState de React 19
 *
 * Pas de toast de succès (optimistic UI via badge suffit).
 * Toast d'erreur uniquement en cas de problème.
 */
export const useAddToWishlist = (options?: UseAddToWishlistOptions) => {
	// Store pour optimistic UI du badge navbar
	const incrementWishlist = useBadgeCountsStore((state) => state.incrementWishlist)
	const decrementWishlist = useBadgeCountsStore((state) => state.decrementWishlist)

	const [isTransitionPending, startTransition] = useTransition()

	const [state, formAction, isActionPending] = useActionState(
		withCallbacks(
			addToWishlist,
			createToastCallbacks({
				showSuccessToast: false,
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === 'object' &&
						'message' in result &&
						typeof result.message === 'string'
					) {
						options?.onSuccess?.(result.message)
					}
				},
				onError: () => {
					// Rollback du badge navbar
					decrementWishlist()
				},
			})
		),
		undefined
	)

	const action = (formData: FormData) => {
		startTransition(() => {
			// Mise à jour optimistic du badge navbar
			incrementWishlist()
			formAction(formData)
		})
	}

	return {
		state,
		action,
		isPending: isTransitionPending || isActionPending,
	}
}
