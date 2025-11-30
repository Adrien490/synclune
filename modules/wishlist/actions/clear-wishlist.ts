'use server'

import { getSession } from "@/modules/auth/lib/get-current-session"
import { getWishlistInvalidationTags } from "@/modules/wishlist/constants/cache"
import { updateTag } from "next/cache"
import { prisma } from "@/shared/lib/prisma"
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit"
import type { ActionState } from "@/shared/types/server-action"
import { ActionStatus } from "@/shared/types/server-action"
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { clearWishlistSchema } from '@/modules/wishlist/schemas/wishlist.schemas'

// Rate limit config pour wishlist
const WISHLIST_RATE_LIMIT = {
	maxRequests: 20,
	windowMs: 60000, // 1 minute
}

/**
 * Server Action pour vider complètement la wishlist
 * Compatible avec useActionState de React 19
 *
 * Pattern:
 * 1. Validation des données (Zod)
 * 2. Rate limiting (protection anti-spam)
 * 3. Authentification (utilisateur connecté ou invité)
 * 4. Transaction DB (delete all wishlist items)
 * 5. Invalidation cache immédiate (read-your-own-writes)
 */
export async function clearWishlist(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérifier l'authentification
		const session = await getSession()
		const userId = session?.user?.id

		if (!userId) {
			return {
				status: ActionStatus.ERROR,
				message: 'Vous devez être connecté pour vider votre wishlist',
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

		const rateLimitId = getRateLimitIdentifier(userId, null, ipAddress)
		const rateLimit = checkRateLimit(rateLimitId, WISHLIST_RATE_LIMIT)

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

		// 4. Récupérer la wishlist de l'utilisateur
		const wishlist = await prisma.wishlist.findUnique({
			where: { userId },
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

			// Mettre à jour le updatedAt de la wishlist si des items ont été supprimés
			if (result.count > 0) {
				await tx.wishlist.update({
					where: { id: wishlist.id },
					data: { updatedAt: new Date() },
				})
			}

			return result
		})

		// 6. Invalidation cache immédiate (read-your-own-writes)
		const tags = getWishlistInvalidationTags(userId, undefined, wishlist.id)
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
