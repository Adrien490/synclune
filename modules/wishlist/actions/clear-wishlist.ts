'use server'

import { getSession } from "@/modules/auth/lib/get-current-session"
import { getWishlistInvalidationTags } from "@/modules/wishlist/constants/cache"
import { updateTag } from "next/cache"
import { prisma } from "@/shared/lib/prisma"
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit"
import { WISHLIST_LIMITS } from "@/shared/lib/rate-limit-config"
import type { ActionState } from "@/shared/types/server-action"
import { ActionStatus } from "@/shared/types/server-action"
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { clearWishlistSchema } from '@/modules/wishlist/schemas/wishlist.schemas'
import {
	getWishlistSessionId,
	getWishlistExpirationDate,
} from "@/modules/wishlist/lib/wishlist-session"

/**
 * Server Action pour vider complètement la wishlist
 * Compatible avec useActionState de React 19
 *
 * Supporte les utilisateurs connectés ET les visiteurs (sessions invité)
 *
 * Pattern:
 * 1. Validation des données (Zod)
 * 2. Rate limiting (protection anti-spam)
 * 3. Récupération wishlist (user ou session)
 * 4. Transaction DB (delete all wishlist items)
 * 5. Invalidation cache immédiate (read-your-own-writes)
 */
export async function clearWishlist(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Récupérer l'authentification (user ou session invité)
		const session = await getSession()
		const userId = session?.user?.id
		const sessionId = !userId ? await getWishlistSessionId() : null

		// Vérifier qu'on a soit un userId soit un sessionId
		if (!userId && !sessionId) {
			return {
				status: ActionStatus.ERROR,
				message: 'Aucune wishlist trouvée',
			}
		}

		// 2. Validation avec Zod (pas de données requises)
		const result = clearWishlistSchema.safeParse({})
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: 'Données invalides',
			}
		}

		// 3. Rate limiting (protection anti-spam)
		const headersList = await headers()
		const ipAddress = await getClientIp(headersList)

		const rateLimitId = getRateLimitIdentifier(userId ?? null, sessionId, ipAddress)
		const rateLimit = checkRateLimit(`wishlist-clear:${rateLimitId}`, WISHLIST_LIMITS.CLEAR)

		if (!rateLimit.success) {
			return {
				status: ActionStatus.ERROR,
				message: rateLimit.error || 'Trop de requêtes. Veuillez réessayer plus tard.',
				data: {
					retryAfter: rateLimit.retryAfter,
					reset: rateLimit.reset,
				},
			}
		}

		// 4. Récupérer la wishlist de l'utilisateur ou visiteur
		const wishlist = await prisma.wishlist.findFirst({
			where: userId ? { userId } : { sessionId },
			select: { id: true },
		})

		if (!wishlist) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: 'Wishlist introuvable',
			}
		}

		// 5. Transaction: Supprimer tous les items et mettre à jour le timestamp
		const deleteResult = await prisma.$transaction(async (tx) => {
			// Supprimer tous les items
			const result = await tx.wishlistItem.deleteMany({
				where: {
					wishlistId: wishlist.id,
				},
			})

			// Toujours mettre à jour le updatedAt et rafraîchir l'expiration pour les visiteurs
			// (même si aucun item supprimé, l'activité utilisateur prolonge la session)
			await tx.wishlist.update({
				where: { id: wishlist.id },
				data: {
					updatedAt: new Date(),
					expiresAt: userId ? null : getWishlistExpirationDate(),
				},
			})

			return result
		})

		// 6. Invalidation cache immédiate (read-your-own-writes)
		const tags = getWishlistInvalidationTags(userId, sessionId || undefined, wishlist.id)
		tags.forEach(tag => updateTag(tag))

		// 7. Revalidation complète pour mise à jour du header (badge count)
		revalidatePath('/', 'layout')

		return {
			status: ActionStatus.SUCCESS,
			message:
				deleteResult.count > 0
					? `${deleteResult.count} article${deleteResult.count > 1 ? 's' : ''} retiré${deleteResult.count > 1 ? 's' : ''} de votre wishlist`
					: 'Votre wishlist est déjà vide',
			data: {
				wishlistId: wishlist.id,
				itemsRemoved: deleteResult.count,
			},
		}
	} catch (e) {
		console.error('[CLEAR_WISHLIST] Error:', e);
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue. Veuillez réessayer.",
		}
	}
}
