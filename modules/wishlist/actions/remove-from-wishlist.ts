'use server'

import { getSession } from "@/shared/utils/get-session"
import { getWishlistInvalidationTags } from "@/modules/wishlist/constants/cache"
import { updateTag } from "next/cache"
import { prisma } from "@/shared/lib/prisma"
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit"
import type { ActionState } from "@/shared/types/server-action"
import { ActionStatus } from "@/shared/types/server-action"
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { removeFromWishlistSchema } from '@/modules/wishlist/schemas/wishlist.schemas'

// Rate limit config pour wishlist
const WISHLIST_RATE_LIMIT = {
	maxRequests: 20,
	windowMs: 60000, // 1 minute
}

/**
 * Server Action pour retirer un article de la wishlist
 * Compatible avec useActionState de React 19
 *
 * Pattern:
 * 1. Validation des données (Zod)
 * 2. Rate limiting (protection anti-spam)
 * 3. Authentification (wishlist requiert connexion)
 * 4. Transaction DB (delete wishlist item)
 * 5. Invalidation cache immédiate (read-your-own-writes)
 */
export async function removeFromWishlist(
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
				message: 'Vous devez être connecté pour retirer des articles de votre wishlist',
			}
		}

		// 2. Extraction des données du FormData
		const rawData = {
			skuId: formData.get('skuId') as string,
		}

		// 3. Validation avec Zod
		const result = removeFromWishlistSchema.safeParse(rawData)
		if (!result.success) {
			const firstError = result.error.issues[0]
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError?.message || 'Données invalides',
			}
		}

		const validatedData = result.data

		// 4. Rate limiting (protection anti-spam)
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

		// 5. Valider le SKU (existence)
		const sku = await prisma.productSku.findUnique({
			where: { id: validatedData.skuId },
			select: { id: true },
		})

		if (!sku) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: 'Produit introuvable',
			}
		}

		// 6. Récupérer la wishlist de l'utilisateur
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

		// 8. Supprimer l'item de la wishlist et mettre à jour le timestamp
		const deleteResult = await prisma.$transaction(async (tx) => {
			const result = await tx.wishlistItem.deleteMany({
				where: {
					wishlistId: wishlist.id,
					skuId: validatedData.skuId,
				},
			})

			// Mettre à jour le updatedAt de la wishlist si un item a été supprimé
			if (result.count > 0) {
				await tx.wishlist.update({
					where: { id: wishlist.id },
					data: { updatedAt: new Date() },
				})
			}

			return result
		})

		// 9. Invalidation cache immédiate (read-your-own-writes)
		const tags = getWishlistInvalidationTags(userId, undefined, wishlist.id)
		tags.forEach(tag => updateTag(tag))

		// 10. Revalidation complète pour mise à jour du header (badge count)
		revalidatePath('/', 'layout')

		return {
			status: ActionStatus.SUCCESS,
			message: deleteResult.count > 0 ? 'Retiré de votre wishlist' : 'Article déjà absent',
			data: {
				wishlistId: wishlist.id,
				removed: deleteResult.count > 0,
			},
		}
	} catch (e) {
		console.error('[REMOVE_FROM_WISHLIST] Error:', e);
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue. Veuillez réessayer.",
		}
	}
}
