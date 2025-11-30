"use client";

import { useActionState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { toggleWishlistItem } from "@/modules/wishlist/actions/toggle-wishlist-item"
import { withCallbacks } from "@/shared/utils/with-callbacks"
import { ActionStatus, type ActionState } from '@/shared/types/server-action'

interface UseToggleWishlistItemOptions {
	onSuccess?: (message: string, action: 'added' | 'removed') => void
}

/**
 * Hook pour toggle un article dans la wishlist
 * Si présent → retire, si absent → ajoute
 *
 * Compatible avec useActionState de React 19
 * Utilise withCallbacks pour :
 * - Rediriger vers la connexion si non authentifié
 * - Afficher un message avec timer si rate limited
 * - Afficher un toast de succès
 *
 * Usage:
 * ```tsx
 * const { action, isPending } = useToggleWishlistItem()
 *
 * <form action={action}>
 *   <input type="hidden" name="skuId" value={sku.id} />
 *   <button type="submit" disabled={isPending}>
 *     <HeartIcon filled={isInWishlist} />
 *   </button>
 * </form>
 * ```
 */
export const useToggleWishlistItem = (options?: UseToggleWishlistItemOptions) => {
	const router = useRouter()
	const pathname = usePathname()

	const [state, action, isPending] = useActionState(
		withCallbacks<ActionState>(
			toggleWishlistItem,
			{
				onSuccess: (result) => {
					// Callback personnalisé si fourni
					if (result.data && typeof result.data === 'object' && 'action' in result.data) {
						const action = result.data.action as 'added' | 'removed'
						options?.onSuccess?.(result.message, action)
					}
					// Toast de succès
					toast.success(result.message)
				},
				onError: (result) => {
					// Redirection vers connexion si non authentifié
					if (result.status === ActionStatus.UNAUTHORIZED) {
						const callbackUrl = encodeURIComponent(pathname)
						router.push(`/connexion?callbackUrl=${callbackUrl}`)
						return
					}

					// Afficher le timer de rate limiting si disponible
					if (result.data && typeof result.data === 'object' && 'retryAfter' in result.data) {
						const retryAfter = result.data.retryAfter as number
						toast.error(`${result.message} Réessayez dans ${retryAfter}s`)
						return
					}

					// Toast d'erreur standard
					toast.error(result.message)
				},
			}
		),
		undefined
	)

	return {
		state,
		action,
		isPending,
	}
}
