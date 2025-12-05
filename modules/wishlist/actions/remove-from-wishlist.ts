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
import { removeFromWishlistSchema } from '@/modules/wishlist/schemas/wishlist.schemas'
import {
	getWishlistSessionId,
	getWishlistExpirationDate,
} from "@/modules/wishlist/lib/wishlist-session"

/**
 * Server Action pour retirer un article de la wishlist
 * Compatible avec useActionState de React 19
 *
 * Supporte les utilisateurs connectés ET les visiteurs (sessions invité)
 *
 * Pattern:
 * 1. Validation des données (Zod)
 * 2. Rate limiting (protection anti-spam)
 * 3. Récupération wishlist (user ou session)
 * 4. Transaction DB (delete wishlist item)
 * 5. Invalidation cache immédiate (read-your-own-writes)
 */
export async function removeFromWishlist(
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

		const rateLimitId = getRateLimitIdentifier(userId ?? null, sessionId, ipAddress)
		const rateLimit = checkRateLimit(`wishlist-remove:${rateLimitId}`, WISHLIST_LIMITS.REMOVE)

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

		// 6. Récupérer la wishlist de l'utilisateur ou visiteur
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

		// 7. Supprimer l'item de la wishlist et mettre à jour le timestamp
		const deleteResult = await prisma.$transaction(async (tx) => {
			const result = await tx.wishlistItem.deleteMany({
				where: {
					wishlistId: wishlist.id,
					skuId: validatedData.skuId,
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

		// 8. Invalidation cache immédiate (read-your-own-writes)
		const tags = getWishlistInvalidationTags(userId, sessionId || undefined, wishlist.id)
		tags.forEach(tag => updateTag(tag))

		// 9. Revalidation complète pour mise à jour du header (badge count)
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
