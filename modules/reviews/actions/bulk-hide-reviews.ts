"use server"

import { updateTag } from "next/cache"
import { prisma, notDeleted } from "@/shared/lib/prisma"
import { requireAdmin } from "@/modules/auth/lib/require-auth"
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers"
import {
	success,
	error,
	validationError,
	handleActionError,
} from "@/shared/lib/actions"
import { ADMIN_REVIEW_LIMITS } from "@/shared/lib/rate-limit-config"
import type { ActionState } from "@/shared/types/server-action"

import { REVIEWS_CACHE_TAGS, getReviewModerationTags } from "../constants/cache"
import { REVIEW_ERROR_MESSAGES } from "../constants/review.constants"
import { bulkHideReviewsSchema } from "../schemas/review.schemas"
import { updateProductReviewStats } from "../services/review-stats.service"

/**
 * Masque plusieurs avis en masse
 * Action admin uniquement
 */
export async function bulkHideReviews(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification admin
		const adminCheck = await requireAdmin()
		if ("error" in adminCheck) return adminCheck.error

		// 1b. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_REVIEW_LIMITS.BULK_OPERATIONS)
		if ("error" in rateLimit) return rateLimit.error

		// 2. Extraire et valider les données
		let parsedIds: unknown = []
		try {
			parsedIds = JSON.parse((formData.get("ids") as string) || "[]")
		} catch {
			parsedIds = []
		}

		const rawData = {
			ids: parsedIds,
		}

		const validation = bulkHideReviewsSchema.safeParse(rawData)
		if (!validation.success) {
			const firstError = validation.error.issues[0]
			const errorPath = firstError?.path.join(".")
			return validationError(
				errorPath ? `${errorPath}: ${firstError.message}` : firstError?.message || REVIEW_ERROR_MESSAGES.INVALID_DATA
			)
		}

		const { ids } = validation.data

		// 3. Récupérer les avis pour connaître leurs productIds
		const reviews = await prisma.productReview.findMany({
			where: {
				id: { in: ids },
				...notDeleted,
			},
			select: {
				id: true,
				productId: true,
			},
		})

		if (reviews.length === 0) {
			return error("Aucun avis trouvé")
		}

		// 4. Masquer tous les avis et recalculer les stats
		// Filtrer les productIds null (produits archivés)
		const productIds = [...new Set(reviews.map((r) => r.productId).filter((id): id is string => id !== null))]

		await prisma.$transaction(async (tx) => {
			// Masquer tous les avis
			await tx.productReview.updateMany({
				where: {
					id: { in: ids },
					...notDeleted,
				},
				data: { status: "HIDDEN" },
			})

			// Recalculer les stats pour chaque produit affecté en parallèle
			await Promise.all(
				productIds.map((productId) => updateProductReviewStats(tx, productId))
			)
		})

		// 5. Invalider le cache pour chaque avis et produit
		const tagsToInvalidate = new Set<string>()

		reviews.forEach((review) => {
			getReviewModerationTags(review.productId, review.id).forEach((tag) =>
				tagsToInvalidate.add(tag)
			)
		})

		// Ajouter le tag admin list
		tagsToInvalidate.add(REVIEWS_CACHE_TAGS.ADMIN_LIST)

		tagsToInvalidate.forEach((tag) => updateTag(tag))

		return success(`${reviews.length} avis masqué(s) avec succès`, { count: reviews.length })
	} catch (e) {
		return handleActionError(e, REVIEW_ERROR_MESSAGES.MODERATE_FAILED)
	}
}
