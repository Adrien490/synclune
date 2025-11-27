'use client'

import { useActionState } from 'react'
import { toggleWishlistItem } from "@/modules/wishlist/actions/toggle-wishlist-item"

interface UseToggleWishlistItemOptions {
	onSuccess?: (message: string, action: 'added' | 'removed') => void
}

/**
 * Hook pour toggle un article dans la wishlist avec Optimistic UI
 * Si présent → retire, si absent → ajoute
 *
 * Compatible avec useActionState de React 19
 * Note : Pas de toast automatique car on utilise optimistic updates (feedback visuel instantané)
 *
 * Usage:
 * ```tsx
 * const { state, action, isPending } = useToggleWishlistItem()
 *
 * <form action={action}>
 *   <input type="hidden" name="skuId" value={sku.id} />
 *   <button type="submit" disabled={isPending}>
 *     <HeartIcon filled={isInWishlist} />
 *   </button>
 * </form>
 * ```
 */
export const useToggleWishlistItem = (_options?: UseToggleWishlistItemOptions) => {
	const [state, action, isPending] = useActionState(toggleWishlistItem, undefined)

	return {
		state,
		action,
		isPending,
	}
}
