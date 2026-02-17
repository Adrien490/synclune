"use server"

import { updateTag } from "next/cache"
import { Prisma } from "@/app/generated/prisma/client"
import { prisma } from "@/shared/lib/prisma"
import { requireAuth } from "@/modules/auth/lib/require-auth"
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers"
import {
	success,
	error,
	forbidden,
	validationError,
	handleActionError,
} from "@/shared/lib/actions"
import { PRODUCT_LIMITS } from "@/shared/lib/rate-limit-config"
import { sanitizeText } from "@/shared/lib/sanitize"
import type { ActionState } from "@/shared/types/server-action"

import { getReviewInvalidationTags } from "../constants/cache"
import { REVIEW_ERROR_MESSAGES } from "../constants/review.constants"
import { createReviewSchema } from "../schemas/review.schemas"
import { updateProductReviewStats } from "../services/review-stats.service"
import { canUserReviewProduct } from "../data/can-user-review-product"

/**
 * Crée un nouvel avis sur un produit
 *
 * Conditions requises:
 * - Utilisateur connecté
 * - A acheté le produit (commande livrée)
 * - N'a pas déjà laissé d'avis sur ce produit
 */
export async function createReview(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification de l'authentification
		const auth = await requireAuth()
		if ("error" in auth) return auth.error

		const userId = auth.user.id

		// 2. Rate limiting
		const rateLimitCheck = await enforceRateLimitForCurrentUser(
			PRODUCT_LIMITS.REVIEW
		)
		if ("error" in rateLimitCheck) return rateLimitCheck.error

		// 3. Extraire les données du FormData
		let parsedMedia: unknown = []
		try {
			parsedMedia = JSON.parse((formData.get("media") as string) || "[]")
		} catch {
			parsedMedia = []
		}

		const rawData = {
			productId: formData.get("productId"),
			orderItemId: formData.get("orderItemId"),
			rating: formData.get("rating"),
			title: formData.get("title") || undefined,
			content: formData.get("content"),
			media: parsedMedia,
		}

		// 4. Valider les données
		const validation = createReviewSchema.safeParse(rawData)

		if (!validation.success) {
			const firstError = validation.error.issues?.[0]
			const errorPath = firstError?.path.join(".")
			return validationError(
				errorPath ? `${errorPath}: ${firstError.message}` : firstError?.message || REVIEW_ERROR_MESSAGES.INVALID_DATA
			)
		}

		const { productId, orderItemId, rating, title, content, media } = validation.data

		// 4b. Sanitize text inputs
		const sanitizedTitle = title ? sanitizeText(title) : null
		const sanitizedContent = sanitizeText(content)

		// 5. Vérifier l'éligibilité de l'utilisateur
		const eligibility = await canUserReviewProduct(userId, productId)

		if (!eligibility.canReview) {
			let message = "Vous ne pouvez pas laisser d'avis sur ce produit"
			switch (eligibility.reason) {
				case "already_reviewed":
					message = REVIEW_ERROR_MESSAGES.ALREADY_REVIEWED
					break
				case "no_purchase":
					message = REVIEW_ERROR_MESSAGES.NO_PURCHASE
					break
				case "order_not_delivered":
					message = REVIEW_ERROR_MESSAGES.ORDER_NOT_DELIVERED
					break
			}
			return forbidden(message)
		}

		// 6. Vérifier que l'orderItemId fourni correspond à celui éligible
		if (eligibility.orderItemId !== orderItemId) {
			return validationError("Référence de commande invalide")
		}

		// 7. Créer l'avis avec ses médias dans une transaction
		const review = await prisma.$transaction(async (tx) => {
			// Créer l'avis
			const newReview = await tx.productReview.create({
				data: {
					productId,
					userId,
					orderItemId,
					rating,
					title: sanitizedTitle,
					content: sanitizedContent,
					status: "PUBLISHED", // Auto-publié
				},
				select: {
					id: true,
					productId: true,
				},
			})

			// Créer les médias si présents
			if (media.length > 0) {
				await tx.reviewMedia.createMany({
					data: media.map((m, index) => ({
						reviewId: newReview.id,
						url: m.url,
						blurDataUrl: m.blurDataUrl || null,
						altText: m.altText ? sanitizeText(m.altText) : null,
						position: index,
					})),
				})
			}

			// Mettre à jour les statistiques du produit
			await updateProductReviewStats(tx, productId)

			return newReview
		})

		// 8. Invalider le cache
		const tags = getReviewInvalidationTags(productId, userId, review.id)
		tags.forEach((tag) => updateTag(tag))

		return success("Merci pour votre avis !", { id: review.id })
	} catch (e) {
		// Unique constraint violation (userId, productId) - race condition on double submit
		if (
			e instanceof Prisma.PrismaClientKnownRequestError &&
			e.code === "P2002"
		) {
			return error(REVIEW_ERROR_MESSAGES.ALREADY_REVIEWED)
		}
		return handleActionError(e, REVIEW_ERROR_MESSAGES.CREATE_FAILED)
	}
}
