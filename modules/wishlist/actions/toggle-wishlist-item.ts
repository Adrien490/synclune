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
import { toggleWishlistItemSchema } from '@/modules/wishlist/schemas/wishlist.schemas'
import {
	getOrCreateWishlistSessionId,
	getWishlistExpirationDate,
} from "@/modules/wishlist/lib/wishlist-session"
import { WISHLIST_ERROR_MESSAGES } from "@/modules/wishlist/constants/error-messages"

/**
 * Server Action pour toggle un article dans la wishlist
 * Si présent → retire, si absent → ajoute
 *
 * Supporte les utilisateurs connectés ET les visiteurs (sessions invité)
 *
 * Pattern:
 * 1. Validation des données (Zod)
 * 2. Rate limiting (protection anti-spam)
 * 3. Récupération/création wishlist (user ou session)
 * 4. Transaction DB (check existence → add ou remove)
 * 5. Invalidation cache immédiate (read-your-own-writes)
 */
export async function toggleWishlistItem(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Récupérer l'authentification (user ou session invité)
		const session = await getSession()
		const userId = session?.user?.id
		const sessionId = !userId ? await getOrCreateWishlistSessionId() : null

		// Vérifier qu'on a soit un userId soit un sessionId
		if (!userId && !sessionId) {
			return {
				status: ActionStatus.ERROR,
				message: WISHLIST_ERROR_MESSAGES.GENERAL_ERROR,
			}
		}

		// 2. Extraction des données du FormData
		const rawData = {
			skuId: formData.get('skuId') as string,
		}

		// 3. Validation avec Zod
		const result = toggleWishlistItemSchema.safeParse(rawData)
		if (!result.success) {
			const firstError = result.error.issues[0]
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError?.message || WISHLIST_ERROR_MESSAGES.INVALID_DATA,
			}
		}

		const validatedData = result.data

		// 4. Rate limiting (protection anti-spam)
		const headersList = await headers()
		const ipAddress = await getClientIp(headersList)

		const rateLimitId = getRateLimitIdentifier(userId ?? null, sessionId, ipAddress)
		const rateLimit = checkRateLimit(rateLimitId, WISHLIST_LIMITS.TOGGLE)

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

		// 5. Valider le SKU (existence et status actif)
		const sku = await prisma.productSku.findUnique({
			where: { id: validatedData.skuId },
			select: {
				id: true,
				sku: true,
				isActive: true,
				priceInclTax: true,
				product: {
					select: {
						status: true,
					},
				},
			},
		})

		if (!sku || !sku.isActive || sku.product.status !== 'PUBLIC') {
			return {
				status: ActionStatus.ERROR,
				message: WISHLIST_ERROR_MESSAGES.SKU_INACTIVE,
			}
		}

		// 6. Transaction: Récupérer la wishlist, vérifier existence, ajouter ou retirer
		const transactionResult = await prisma.$transaction(async (tx) => {
			// 6a. Récupérer ou créer la wishlist
			// Pour utilisateur connecté : upsert par userId
			// Pour visiteur : upsert par sessionId
			const wishlist = await tx.wishlist.upsert({
				where: userId ? { userId } : { sessionId: sessionId! },
				create: {
					userId: userId || null,
					sessionId: sessionId || null,
					expiresAt: userId ? null : getWishlistExpirationDate(),
				},
				update: {
					// Rafraîchir l'expiration pour les visiteurs
					expiresAt: userId ? null : getWishlistExpirationDate(),
				},
				select: {
					id: true,
				},
			})

			// 6b. Vérifier si le SKU est déjà dans la wishlist
			const existingItem = await tx.wishlistItem.findUnique({
				where: {
					wishlistId_skuId: {
						wishlistId: wishlist.id,
						skuId: validatedData.skuId,
					},
				},
			})

			if (existingItem) {
				// 6c. Item existe → retirer
				await tx.wishlistItem.delete({
					where: { id: existingItem.id },
				})

				// Mettre à jour le updatedAt de la wishlist
				await tx.wishlist.update({
					where: { id: wishlist.id },
					data: { updatedAt: new Date() },
				})

				return {
					wishlist,
					action: 'removed' as const,
					wishlistItemId: undefined,
				}
			} else {
				// 6d. Item n'existe pas → ajouter
				const wishlistItem = await tx.wishlistItem.create({
					data: {
						wishlistId: wishlist.id,
						skuId: validatedData.skuId,
						priceAtAdd: sku.priceInclTax, // Snapshot du prix
					},
					select: {
						id: true,
					},
				})

				// Mettre à jour le updatedAt de la wishlist
				await tx.wishlist.update({
					where: { id: wishlist.id },
					data: { updatedAt: new Date() },
				})

				return {
					wishlist,
					action: 'added' as const,
					wishlistItemId: wishlistItem.id,
				}
			}
		})

		// 7. Invalidation cache immédiate (read-your-own-writes)
		const tags = getWishlistInvalidationTags(userId, sessionId || undefined, transactionResult.wishlist.id)
		tags.forEach(tag => updateTag(tag))

		// 8. Revalidation complète pour mise à jour du header (badge count)
		revalidatePath('/', 'layout')

		return {
			status: ActionStatus.SUCCESS,
			message:
				transactionResult.action === 'added'
					? 'Ajouté à ta wishlist'
					: 'Retiré de ta wishlist',
			data: {
				wishlistId: transactionResult.wishlist.id,
				action: transactionResult.action,
				wishlistItemId: transactionResult.wishlistItemId,
			},
		}
	} catch (e) {
		console.error('[TOGGLE_WISHLIST_ITEM] Error:', e);
		return {
			status: ActionStatus.ERROR,
			message: WISHLIST_ERROR_MESSAGES.GENERAL_ERROR,
		}
	}
}
