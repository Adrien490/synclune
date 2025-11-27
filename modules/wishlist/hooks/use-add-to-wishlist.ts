'use client'

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks"
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks"
import { useActionState } from 'react'
import { addToWishlist } from "@/modules/wishlist/actions/add-to-wishlist"

interface UseAddToWishlistOptions {
	onSuccess?: (message: string) => void
}

/**
 * Hook pour ajouter un article à la wishlist
 * Compatible avec useActionState de React 19
 *
 * Usage:
 * ```tsx
 * const { state, action, isPending } = useAddToWishlist({
 *   onSuccess: (message) => {
 *     console.log('Article ajouté!', message)
 *   }
 * })
 *
 * <form action={action}>
 *   <input type="hidden" name="skuId" value={sku.id} />
 *   <button type="submit" disabled={isPending}>
 *     Ajouter à la wishlist
 *   </button>
 * </form>
 * ```
 */
export const useAddToWishlist = (options?: UseAddToWishlistOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			addToWishlist,
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
