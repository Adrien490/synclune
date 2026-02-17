'use client'

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks"
import { withCallbacks } from "@/shared/utils/with-callbacks"
import { useActionState, useTransition } from 'react'
import { useRouter, usePathname } from "next/navigation"
import { removeFromWishlist } from "@/modules/wishlist/actions/remove-from-wishlist"
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store"
import { ActionStatus } from "@/shared/types/server-action"

interface UseRemoveFromWishlistOptions {
	onSuccess?: (message: string) => void
	onOptimisticRemove?: (productId: string) => void
}

/**
 * Hook pour retirer un article de la wishlist
 * Compatible avec useActionState de React 19
 *
 * Pas de toast de succès (optimistic UI via badge suffit).
 * Toast d'erreur uniquement en cas de problème.
 *
 * Usage:
 * ```tsx
 * const { state, action, isPending } = useRemoveFromWishlist({
 *   onSuccess: (message) => {
 *     console.log('Article retiré!', message)
 *   }
 * })
 *
 * <form action={action}>
 *   <input type="hidden" name="productId" value={product.id} />
 *   <button type="submit" disabled={isPending}>
 *     Retirer de la wishlist
 *   </button>
 * </form>
 * ```
 */
export const useRemoveFromWishlist = (options?: UseRemoveFromWishlistOptions) => {
	const router = useRouter()
	const pathname = usePathname()

	// Store pour optimistic UI du badge navbar
	const incrementWishlist = useBadgeCountsStore((state) => state.incrementWishlist)
	const decrementWishlist = useBadgeCountsStore((state) => state.decrementWishlist)

	const [isTransitionPending, startTransition] = useTransition()

	const [state, formAction, isActionPending] = useActionState(
		withCallbacks(
			removeFromWishlist,
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
				onError: (result: unknown) => {
					// Rollback du badge navbar (re-increment car on avait décrémenté)
					incrementWishlist()

					// Redirect to login if unauthorized
					if (
						result &&
						typeof result === 'object' &&
						'status' in result &&
						result.status === ActionStatus.UNAUTHORIZED
					) {
						const callbackUrl = encodeURIComponent(pathname)
						router.push(`/connexion?callbackUrl=${callbackUrl}`)
					}
				},
			})
		),
		undefined
	)

	const action = (formData: FormData) => {
		startTransition(() => {
			// Mise à jour optimistic du badge navbar
			decrementWishlist()

			// Notify optimistic list context if provided
			const productId = formData.get("productId")
			if (productId && typeof productId === "string") {
				options?.onOptimisticRemove?.(productId)
			}

			formAction(formData)
		})
	}

	return {
		state,
		action,
		isPending: isTransitionPending || isActionPending,
	}
}
