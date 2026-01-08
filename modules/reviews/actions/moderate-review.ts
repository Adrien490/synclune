"use server"

import { updateTag } from "next/cache"
import { prisma, notDeleted } from "@/shared/lib/prisma"
import { requireAdmin } from "@/modules/auth/lib/require-auth"
import {
	success,
	notFound,
	validationError,
	handleActionError,
} from "@/shared/lib/actions"
import type { ActionState } from "@/shared/types/server-action"

import { getReviewModerationTags } from "../constants/cache"
import { REVIEW_ERROR_MESSAGES } from "../constants/review.constants"
import { moderateReviewSchema } from "../schemas/review.schemas"
import { updateProductReviewStats } from "../services/review-stats.service"

/**
 * Modère un avis (toggle PUBLISHED <-> HIDDEN)
 * Action admin uniquement
 */
export async function moderateReview(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification admin
		const adminCheck = await requireAdmin()
		if ("error" in adminCheck) return adminCheck.error

		// 2. Extraire et valider les données
		const rawData = {
			id: formData.get("id"),
		}

		const validation = moderateReviewSchema.safeParse(rawData)
		if (!validation.success) {
			const firstError = validation.error.issues[0]
			const errorPath = firstError?.path.join(".")
			return validationError(
				errorPath ? `${errorPath}: ${firstError.message}` : firstError?.message || REVIEW_ERROR_MESSAGES.INVALID_DATA
			)
		}

		const { id } = validation.data

		// 3. Récupérer l'avis
		const review = await prisma.productReview.findFirst({
			where: {
				id,
				...notDeleted,
			},
			select: {
				id: true,
				productId: true,
				status: true,
			},
		})

		if (!review) {
			return notFound("Avis")
		}

		// 4. Toggle le statut
		const newStatus = review.status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED"

		await prisma.$transaction(async (tx) => {
			// Mettre à jour le statut
			await tx.productReview.update({
				where: { id },
				data: { status: newStatus },
			})

			// Recalculer les stats (car seuls les PUBLISHED comptent)
			// Seulement si le produit existe encore
			if (review.productId) {
				await updateProductReviewStats(tx, review.productId)
			}
		})

		// 5. Invalider le cache
		const tags = getReviewModerationTags(review.productId, id)
		tags.forEach((tag) => updateTag(tag))

		const message =
			newStatus === "HIDDEN" ? "Avis masqué avec succès" : "Avis republié avec succès"

		return success(message, { status: newStatus })
	} catch (e) {
		return handleActionError(e, REVIEW_ERROR_MESSAGES.MODERATE_FAILED)
	}
}
