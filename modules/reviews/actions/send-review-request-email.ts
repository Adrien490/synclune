"use server"

import { requireAdmin } from "@/modules/auth/lib/require-auth"
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers"
import {
	validationError,
	handleActionError,
} from "@/shared/lib/actions"
import { ADMIN_REVIEW_LIMITS } from "@/shared/lib/rate-limit-config"
import type { ActionState } from "@/shared/types/server-action"

import { REVIEW_ERROR_MESSAGES } from "../constants/review.constants"
import { sendReviewRequestEmailSchema } from "../schemas/review.schemas"
import { executeReviewRequestEmail } from "../services/send-review-request-email.service"

/**
 * Envoie un email de demande d'avis pour une commande livree
 * Action admin uniquement (pour les formulaires)
 *
 * Conditions:
 * - La commande doit etre livree (fulfillmentStatus = DELIVERED)
 * - L'utilisateur doit avoir un email
 * - Il doit y avoir au moins un produit sans avis existant
 */
export async function sendReviewRequestEmailAction(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification admin
		const adminCheck = await requireAdmin()
		if ("error" in adminCheck) return adminCheck.error

		// 1b. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_REVIEW_LIMITS.SEND_EMAIL)
		if ("error" in rateLimit) return rateLimit.error

		// 2. Extraire et valider l'orderId
		const rawData = {
			orderId: formData.get("orderId"),
		}

		const validation = sendReviewRequestEmailSchema.safeParse(rawData)
		if (!validation.success) {
			const firstError = validation.error.issues?.[0]
			const errorPath = firstError?.path.join(".")
			return validationError(
				errorPath ? `${errorPath}: ${firstError.message}` : firstError?.message || REVIEW_ERROR_MESSAGES.INVALID_DATA
			)
		}

		const { orderId } = validation.data

		// 3. Executer la logique metier
		return await executeReviewRequestEmail(orderId)
	} catch (e) {
		return handleActionError(e, REVIEW_ERROR_MESSAGES.EMAIL_FAILED)
	}
}
