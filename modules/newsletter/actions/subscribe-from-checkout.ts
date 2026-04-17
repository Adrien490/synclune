"use server";

import { error, handleActionError, notFound, success, validateInput } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { logger } from "@/shared/lib/logger";
import { notDeleted, prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";

import { subscribeFromCheckoutSchema } from "../schemas/newsletter.schemas";
import { subscribeToNewsletterInternal } from "../services/subscribe-to-newsletter-internal";

interface SubscribeFromCheckoutInput {
	email: string;
	orderId: string;
}

/**
 * Inscrit un client à la newsletter depuis le flow checkout (post-paiement).
 *
 * Appelée par le webhook Stripe `payment_intent.succeeded` ou par order-creation
 * quand `Order.newsletterOptIn = true`. Pas de rate limit (caller signé Stripe).
 *
 * Idempotente : délègue à `subscribeToNewsletterInternal` qui gère les états
 * existants (PENDING/CONFIRMED/UNSUBSCRIBED) et l'enumeration safety.
 */
export async function subscribeFromCheckout(
	input: SubscribeFromCheckoutInput,
): Promise<ActionState> {
	const validation = validateInput(subscribeFromCheckoutSchema, input);
	if ("error" in validation) return validation.error;

	const { email, orderId } = validation.data;

	try {
		// Vérifier que la commande existe et que l'opt-in newsletter est bien actif
		const order = await prisma.order.findFirst({
			where: { id: orderId, ...notDeleted },
			select: {
				id: true,
				newsletterOptIn: true,
				userId: true,
				orderNumber: true,
			},
		});

		if (!order) {
			return notFound("Commande non trouvée");
		}

		if (!order.newsletterOptIn) {
			return error("Le client n'a pas consenti à l'inscription newsletter pour cette commande.");
		}

		const result = await subscribeToNewsletterInternal({
			email,
			ipAddress: "checkout",
			userAgent: "stripe-webhook",
			consentSource: "checkout_form",
		});

		if (!result.success) {
			logger.error("Newsletter subscription from checkout failed", new Error(result.message), {
				service: "subscribe-from-checkout",
				orderId,
			});
			return error(result.message);
		}

		void logAudit({
			adminId: "system",
			adminName: "system:checkout-webhook",
			action: "newsletter.checkoutSubscribe",
			targetType: "newsletter_subscriber",
			targetId: email,
			metadata: {
				orderId: order.id,
				orderNumber: order.orderNumber,
				userId: order.userId,
				alreadySubscribed: result.alreadySubscribed ?? false,
			},
		});

		return success(result.message, { alreadySubscribed: result.alreadySubscribed ?? false });
	} catch (e) {
		return handleActionError(e, "Erreur lors de l'inscription depuis le checkout");
	}
}
