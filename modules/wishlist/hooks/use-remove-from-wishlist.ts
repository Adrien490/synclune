'use client'

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks"
import { withCallbacks } from "@/shared/utils/with-callbacks"
import { useActionState } from 'react'
import { removeFromWishlist } from "@/modules/wishlist/actions/remove-from-wishlist"

interface UseRemoveFromWishlistOptions {
	onSuccess?: (message: string) => void
}

/**
 * Hook pour retirer un article de la wishlist
 * Compatible avec useActionState de React 19
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
 *   <input type="hidden" name="skuId" value={sku.id} />
 *   <button type="submit" disabled={isPending}>
 *     Retirer de la wishlist
 *   </button>
 * </form>
 * ```
 */
export const useRemoveFromWishlist = (options?: UseRemoveFromWishlistOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			removeFromWishlist,
			createToastCallbacks({
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
			})
		),
		undefined
	)

	return {
		state,
		action,
		isPending,
	}
}
