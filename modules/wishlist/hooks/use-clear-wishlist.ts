'use client'

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks"
import { withCallbacks } from "@/shared/utils/with-callbacks"
import { useActionState } from 'react'
import { clearWishlist } from '@/modules/wishlist/actions/clear-wishlist'

interface UseClearWishlistOptions {
	onSuccess?: (message: string, data?: { wishlistId: string; itemsRemoved: number }) => void
	onError?: (message: string) => void
}

/**
 * Hook client pour utiliser l'action clearWishlist
 *
 * @example
 * ```tsx
 * const { action, isPending } = useClearWishlist({
 *   onSuccess: (message) => {
 *     console.log(message) // "3 articles retirés de votre wishlist"
 *   }
 * })
 *
 * <form action={action}>
 *   <button type="submit" disabled={isPending}>
 *     Vider la wishlist
 *   </button>
 * </form>
 * ```
 */
export function useClearWishlist(options?: UseClearWishlistOptions) {
	const { onSuccess, onError } = options || {}

	const [state, formAction, isPending] = useActionState(
		withCallbacks(
			clearWishlist,
			createToastCallbacks({
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === 'object' &&
						'message' in result &&
						typeof result.message === 'string'
					) {
						const data =
							'data' in result ? (result.data as { wishlistId: string; itemsRemoved: number }) : undefined
						onSuccess?.(result.message, data)
					}
				},
				onError: (result: unknown) => {
					if (
						result &&
						typeof result === 'object' &&
						'message' in result &&
						typeof result.message === 'string'
					) {
						onError?.(result.message)
					}
				},
			})
		),
		undefined
	)

	return {
		state,
		action: formAction,
		isPending,
	}
}
