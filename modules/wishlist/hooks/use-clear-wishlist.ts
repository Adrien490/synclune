'use client'

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks"
import { withCallbacks } from "@/shared/utils/with-callbacks"
import { useActionState, useRef } from 'react'
import { clearWishlist } from '@/modules/wishlist/actions/clear-wishlist'
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store"

interface UseClearWishlistOptions {
	onSuccess?: (message: string, data?: { wishlistId: string; itemsRemoved: number }) => void
	onError?: (message: string) => void
}

/**
 * Hook client pour utiliser l'action clearWishlist
 *
 * Optimistic UI: remet le badge wishlist a 0 immediatement,
 * avec rollback automatique en cas d'erreur serveur.
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
	const setWishlistCount = useBadgeCountsStore((state) => state.setWishlistCount)
	const previousCountRef = useRef(0)

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
					// Rollback badge count on error
					setWishlistCount(previousCountRef.current)

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

	const action = (formData: FormData) => {
		// Optimistic: save current count for rollback, then set to 0
		previousCountRef.current = useBadgeCountsStore.getState().wishlistCount
		setWishlistCount(0)
		formAction(formData)
	}

	return {
		state,
		action,
		isPending,
	}
}
