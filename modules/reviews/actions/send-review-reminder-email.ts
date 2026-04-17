"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { validationError, handleActionError } from "@/shared/lib/actions";
import { ADMIN_REVIEW_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { REVIEW_ERROR_MESSAGES } from "../constants/review.constants";
import { sendReviewReminderEmailSchema } from "../schemas/review.schemas";
import { executeReviewReminderEmail } from "../services/send-review-reminder-email.service";

/**
 * Envoie un email de rappel d'avis pour une commande livree (2e tentative manuelle)
 * Action admin uniquement
 *
 * Pre-conditions:
 * - Commande livree (fulfillmentStatus = DELIVERED)
 * - Demande d'avis initiale deja envoyee (reviewRequestSentAt non null)
 * - Aucun rappel precedent envoye (reviewReminderSentAt null)
 * - Au moins un item sans avis
 */
export async function sendReviewReminderEmailAction(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_REVIEW_LIMITS.SEND_REMINDER);
		if ("error" in rateLimit) return rateLimit.error;

		const rawData = {
			orderId: formData.get("orderId"),
		};

		const validation = sendReviewReminderEmailSchema.safeParse(rawData);
		if (!validation.success) {
			const firstError = validation.error.issues[0];
			const errorPath = firstError?.path.join(".");
			return validationError(
				errorPath
					? `${errorPath}: ${firstError?.message}`
					: (firstError?.message ?? REVIEW_ERROR_MESSAGES.INVALID_DATA),
			);
		}

		const { orderId } = validation.data;

		return await executeReviewReminderEmail(orderId);
	} catch (e) {
		return handleActionError(e, REVIEW_ERROR_MESSAGES.REMINDER_FAILED);
	}
}
