import { prisma } from "@/shared/lib/prisma";
import { sendReviewReminderEmail } from "@/modules/emails/services/review-emails";
import { SITE_URL } from "@/shared/constants/seo-config";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
import { success, notFound, error, validationError, handleActionError } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";

import { REVIEW_ERROR_MESSAGES } from "../constants/review.constants";
import { getOrderForReviewRequest } from "../data/get-order-for-review-request";

/**
 * Logique metier pour envoyer un email de rappel d'avis (2e tentative apres la demande initiale)
 *
 * Pre-conditions:
 * - La commande doit etre livree
 * - L'email de demande initial doit deja avoir ete envoye (reviewRequestSentAt non null)
 * - Aucun rappel deja envoye (reviewReminderSentAt null) pour eviter le double-envoi
 * - L'utilisateur a un email
 * - Au moins un item de la commande n'a pas encore d'avis
 */
export async function executeReviewReminderEmail(orderId: string): Promise<ActionState> {
	const order = await getOrderForReviewRequest(orderId);

	if (!order) {
		return notFound("Commande");
	}

	if (order.fulfillmentStatus !== "DELIVERED") {
		return validationError("La commande n'est pas encore livrée");
	}

	if (!order.user?.email) {
		return validationError("Utilisateur sans email");
	}

	if (!order.reviewRequestSentAt) {
		return validationError(REVIEW_ERROR_MESSAGES.REQUEST_NOT_SENT);
	}

	// Re-read order to check the reminder flag (getOrderForReviewRequest doesn't select reviewReminderSentAt)
	const reminderState = await prisma.order.findUnique({
		where: { id: orderId },
		select: { reviewReminderSentAt: true },
	});

	if (reminderState?.reviewReminderSentAt) {
		return validationError(REVIEW_ERROR_MESSAGES.REMINDER_ALREADY_SENT);
	}

	const itemsWithoutReview = order.items.filter((item) => !item.review);
	if (itemsWithoutReview.length === 0) {
		return validationError(REVIEW_ERROR_MESSAGES.ALL_REVIEWED);
	}

	const reviewUrl = `${SITE_URL}/commandes`;
	const unsubscribeUrl = buildUrl(ROUTES.NOTIFICATIONS.UNSUBSCRIBE);

	// Optimistic lock: mark BEFORE sending to prevent duplicates on crash/timeout
	await prisma.order.update({
		where: { id: orderId },
		data: { reviewReminderSentAt: new Date() },
	});

	const result = await sendReviewReminderEmail({
		to: order.user.email,
		customerName: order.user.name ?? order.user.email,
		orderNumber: order.orderNumber,
		reviewUrl,
		unsubscribeUrl,
	});

	if (!result.success) {
		// Rollback on failure so the admin can retry (or the cron will pick it up)
		await prisma.order.update({
			where: { id: orderId },
			data: { reviewReminderSentAt: null },
		});
		return error(REVIEW_ERROR_MESSAGES.REMINDER_FAILED);
	}

	return success("Rappel d'avis envoyé avec succès");
}

/**
 * Helper pour envoyer un rappel d'avis de maniere programmatique
 * Utilise par les services internes (cron, webhooks, actions admin)
 *
 * NOT a "use server" function - cannot be called from the client
 */
export async function sendReviewReminderEmailInternal(orderId: string): Promise<ActionState> {
	try {
		return await executeReviewReminderEmail(orderId);
	} catch (e) {
		return handleActionError(e, REVIEW_ERROR_MESSAGES.REMINDER_FAILED);
	}
}
