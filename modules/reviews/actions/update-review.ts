"use server"

import { updateTag } from "next/cache"
import { prisma, notDeleted } from "@/shared/lib/prisma"
import { requireAuth } from "@/modules/auth/lib/require-auth"
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers"
import {
	success,
	notFound,
	forbidden,
	validationError,
	handleActionError,
} from "@/shared/lib/actions"
import { PRODUCT_LIMITS } from "@/shared/lib/rate-limit-config"
import { sanitizeText } from "@/shared/lib/sanitize"
import type { ActionState } from "@/shared/types/server-action"

import { getReviewInvalidationTags } from "../constants/cache"
import { REVIEW_ERROR_MESSAGES } from "../constants/review.constants"
import { updateReviewSchema } from "../schemas/review.schemas"
import { updateProductReviewStats } from "../services/review-stats.service"
import { deleteUploadThingFilesFromUrls } from "@/modules/media/services/delete-uploadthing-files.service"

/**
 * Modifie un avis existant
 *
 * Conditions requises:
 * - Utilisateur connecté
 * - Auteur de l'avis
 */
export async function updateReview(
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
		const rawData = {
			id: formData.get("id"),
			rating: formData.get("rating"),
			title: formData.get("title") || undefined,
			content: formData.get("content"),
			media: JSON.parse((formData.get("media") as string) || "[]"),
		}

		// 4. Valider les données
		const validation = updateReviewSchema.safeParse(rawData)

		if (!validation.success) {
			const firstError = validation.error.issues?.[0]
			const errorPath = firstError?.path.join(".")
			return validationError(
				errorPath ? `${errorPath}: ${firstError.message}` : firstError?.message || REVIEW_ERROR_MESSAGES.INVALID_DATA
			)
		}

		const { id, rating, title, content, media } = validation.data

		// 4b. Sanitize text inputs
		const sanitizedTitle = title ? sanitizeText(title) : null
		const sanitizedContent = sanitizeText(content)

		// 5. Vérifier que l'avis existe et appartient à l'utilisateur
		const existingReview = await prisma.productReview.findFirst({
			where: {
				id,
				...notDeleted,
			},
			select: {
				id: true,
				userId: true,
				productId: true,
				medias: {
					select: { url: true },
				},
			},
		})

		if (!existingReview) {
			return notFound("Avis")
		}

		if (existingReview.userId !== userId) {
			return forbidden(REVIEW_ERROR_MESSAGES.NOT_OWNER)
		}

		// 6. Mettre à jour l'avis dans une transaction
		const review = await prisma.$transaction(async (tx) => {
			// Mettre à jour l'avis
			const updatedReview = await tx.productReview.update({
				where: { id },
				data: {
					rating,
					title: sanitizedTitle,
					content: sanitizedContent,
				},
				select: {
					id: true,
					productId: true,
				},
			})

			// Supprimer les anciens médias
			await tx.reviewMedia.deleteMany({
				where: { reviewId: id },
			})

			// Créer les nouveaux médias si présents
			if (media.length > 0) {
				await tx.reviewMedia.createMany({
					data: media.map((m, index) => ({
						reviewId: id,
						url: m.url,
						blurDataUrl: m.blurDataUrl || null,
						altText: m.altText || null,
						position: index,
					})),
				})
			}

			// Mettre à jour les statistiques du produit (la note a pu changer)
			// Seulement si le produit existe encore
			if (existingReview.productId) {
				await updateProductReviewStats(tx, existingReview.productId)
			}

			return updatedReview
		})

		// 7. Invalider le cache
		const tags = getReviewInvalidationTags(existingReview.productId, userId, review.id)
		tags.forEach((tag) => updateTag(tag))

		// 8. Supprimer les anciennes photos remplacees de UploadThing
		const oldUrls = new Set(existingReview.medias.map((m) => m.url))
		const newUrls = new Set(media.map((m) => m.url))
		const removedUrls = [...oldUrls].filter((url): url is string => !newUrls.has(url))

		if (removedUrls.length > 0) {
			deleteUploadThingFilesFromUrls(removedUrls).catch((err) => {
				console.error("[updateReview] Erreur suppression fichiers UploadThing:", err)
			})
		}

		return success("Votre avis a été modifié", { id: review.id })
	} catch (e) {
		return handleActionError(e, REVIEW_ERROR_MESSAGES.UPDATE_FAILED)
	}
}
