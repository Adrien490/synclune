"use server";

import Stripe from "stripe";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { PENDING_SESSION_PLACEHOLDER_PREFIX } from "@/modules/payments/constants/checkout.constants";
import { cancelOrderFromExpiredSession } from "@/modules/webhooks/services/checkout-session-transitions.service";
import { error, handleActionError, notFound, success, validateInput } from "@/shared/lib/actions";
import { updateTagsAfterMutation } from "@/shared/lib/cache";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { stripe } from "@/shared/lib/stripe";
import type { ActionState } from "@/shared/types/server-action";

import { cancelOrderSchema } from "../schemas/order.schemas";

/**
 * « Annuler » une commande PENDING : même mécanique que le webhook
 * `checkout.session.expired` — transition gardée + restock exactement-une-fois
 * (`cancelOrderFromExpiredSession`, service partagé).
 *
 * ⚠️ On ferme la porte Stripe AVANT la transition : une session encore `open`
 * laisserait la cliente payer une commande déjà annulée et restockée (le
 * webhook `completed` tomberait sur count = 0, l'argent serait pris sans
 * commande). `sessions.expire` n'est possible que sur une session ouverte —
 * si elle est déjà `complete`, la cliente vient de payer : on refuse
 * l'annulation. L'expiration déclenchera aussi le webhook `expired`, qui sera
 * un no-op (garde de transition). REFUNDED appartient au lot 5.
 */
export async function cancelOrder(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	const admin = await requireAdmin();
	if ("error" in admin) return admin.error;

	const validation = validateInput(cancelOrderSchema, { orderId: formData.get("orderId") });
	if ("error" in validation) return validation.error;
	const { orderId } = validation.data;

	try {
		const order = await prisma.order.findUnique({
			where: { id: orderId },
			select: { stripeSessionId: true, status: true },
		});
		if (!order) return notFound("Commande introuvable.");
		if (order.status !== "PENDING") {
			return error("Seule une commande en attente de paiement peut être annulée ici.");
		}

		if (!order.stripeSessionId.startsWith(PENDING_SESSION_PLACEHOLDER_PREFIX)) {
			try {
				await stripe.checkout.sessions.expire(order.stripeSessionId);
			} catch (e) {
				if (e instanceof Stripe.errors.StripeInvalidRequestError) {
					if (e.code === "resource_missing") {
						// Session inconnue de Stripe (autre environnement) : rien à fermer.
					} else {
						// `expire` ne marche que sur une session `open` : retrieve pour
						// distinguer « déjà payée » (on refuse) de « déjà expirée » (ok).
						const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
						if (session.status === "complete") {
							return error(
								"Impossible d'annuler : la cliente vient de payer cette commande. Rafraîchis la page.",
							);
						}
					}
				} else {
					throw e;
				}
			}
		}

		const result = await cancelOrderFromExpiredSession(order.stripeSessionId);
		if (result.outcome === "noop") {
			return error("Cette commande n'était déjà plus en attente de paiement.");
		}

		updateTagsAfterMutation(result.tags);
		logger.info("[cancelOrder] Commande annulée par l'admin, stock restitué", { orderId });
		return success("Commande annulée, stock restitué.");
	} catch (e) {
		return handleActionError(e, "Impossible d'annuler la commande.");
	}
}
