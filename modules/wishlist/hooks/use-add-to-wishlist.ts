'use client'

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks"
import { withCallbacks } from "@/shared/utils/with-callbacks"
import { useActionState } from 'react'
import { addToWishlist } from "@/modules/wishlist/actions/add-to-wishlist"

interface UseAddToWishlistOptions {
	onSuccess?: (message: string) => void
}

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
