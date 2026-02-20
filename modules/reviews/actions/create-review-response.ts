"use server"

import { updateTag } from "next/cache"
import { prisma, notDeleted } from "@/shared/lib/prisma"
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth"
import {
	success,
	notFound,
	error,
	validationError,
	handleActionError,
} from "@/shared/lib/actions"
import { sendReviewResponseEmail } from "@/modules/emails/services/review-emails"
import { sanitizeText } from "@/shared/lib/sanitize"
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers"
import { ADMIN_REVIEW_LIMITS } from "@/shared/lib/rate-limit-config"
import type { ActionState } from "@/shared/types/server-action"

import { REVIEWS_CACHE_TAGS, getReviewModerationTags } from "../constants/cache"
import { REVIEW_ERROR_MESSAGES } from "../constants/review.constants"
import { createReviewResponseSchema } from "../schemas/review.schemas"
import { buildUrl, ROUTES } from "@/shared/constants/urls"

/**
 * Crée une réponse admin à un avis
 * Action admin uniquement
 */
export async function createReviewResponse(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification authentification + admin (un seul appel)
		const auth = await requireAdminWithUser()
		if ("error" in auth) return auth.error

		const user = auth.user

		// 1b. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_REVIEW_LIMITS.RESPONSE)
		if ("error" in rateLimit) return rateLimit.error

		// 2. Extraire et valider les données
		const rawData = {
			reviewId: formData.get("reviewId"),
			content: formData.get("content"),
		}

		const validation = createReviewResponseSchema.safeParse(rawData)
		if (!validation.success) {
			const firstError = validation.error.issues?.[0]
			const errorPath = firstError?.path.join(".")
			return validationError(
				errorPath ? `${errorPath}: ${firstError.message}` : firstError?.message || REVIEW_ERROR_MESSAGES.INVALID_DATA
			)
		}

		const { reviewId, content } = validation.data

		// 2b. Sanitize text inputs
		const sanitizedContent = sanitizeText(content)

		// 3. Vérifier que l'avis existe et n'a pas déjà de réponse
		const review = await prisma.productReview.findFirst({
			where: {
				id: reviewId,
				...notDeleted,
			},
			select: {
				id: true,
				productId: true,
				content: true,
				response: {
					select: { id: true },
				},
				user: {
					select: {
						email: true,
						name: true,
					},
				},
				product: {
					select: {
						title: true,
						slug: true,
					},
				},
			},
		})

		if (!review) {
			return notFound("Avis")
		}

		// Vérifier que l'avis n'est pas orphelin (produit/user supprimé)
		if (!review.productId || !review.user || !review.product) {
			return error("Impossible de répondre à cet avis (produit ou utilisateur supprimé)")
		}

		if (review.response) {
			return error(REVIEW_ERROR_MESSAGES.RESPONSE_ALREADY_EXISTS)
		}

		// 4. Créer la réponse
		const response = await prisma.reviewResponse.create({
			data: {
				reviewId,
				content: sanitizedContent,
				authorId: user.id,
				authorName: user.name || "Synclune",
			},
			select: {
				id: true,
			},
		})

		// 5. Invalider le cache
		const tags = getReviewModerationTags(review.productId, reviewId)
		tags.forEach((tag) => updateTag(tag))
		updateTag(REVIEWS_CACHE_TAGS.ADMIN_LIST)

		// 6. Envoyer l'email de notification au client (fire-and-forget)
		if (review.user.email) {
			sendReviewResponseEmail({
				to: review.user.email,
				customerName: review.user.name?.split(" ")[0] || "Cliente",
				productTitle: review.product.title,
				reviewContent: review.content,
				responseContent: sanitizedContent,
				responseAuthorName: user.name || "Synclune",
				productUrl: buildUrl(ROUTES.SHOP.PRODUCT(review.product.slug)),
			}).catch((emailError) => {
				console.error("[REVIEW_RESPONSE] Failed to send notification email:", emailError)
			})
		}

		return success("Réponse publiée avec succès", { id: response.id })
	} catch (e) {
		return handleActionError(e, REVIEW_ERROR_MESSAGES.RESPONSE_CREATE_FAILED)
	}
}
