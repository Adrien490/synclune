"use server";

import Stripe from "stripe";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import {
	PENDING_ORDER_RECONCILE_AGE_HOURS,
	PENDING_SESSION_PLACEHOLDER_PREFIX,
} from "@/modules/payments/constants/checkout.constants";
import {
	cancelOrderFromExpiredSession,
	markOrderPaidFromSession,
} from "@/modules/webhooks/services/checkout-session-transitions.service";
import { handleActionError, success } from "@/shared/lib/actions";
import { updateTagsAfterMutation } from "@/shared/lib/cache";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { stripe } from "@/shared/lib/stripe";
import type { ActionState } from "@/shared/types/server-action";

const RECONCILE_BATCH_SIZE = 25;

/**
 * « Vérifier les commandes en attente » — filet manuel contre les réservations
 * orphelines (lot 3, § 4 du prompt).
 *
 * Si le webhook `checkout.session.expired` n'arrive jamais (perdu au-delà des
 * 3 jours de redélivrance Stripe), du stock reste réservé par des commandes
 * PENDING. Pas de cron (perte volontaire § 1) : Léane clique, on interroge
 * Stripe (`checkout.sessions.retrieve`) et on applique l'état RÉEL de chaque
 * session — les mêmes transitions gardées que le webhook, donc un rejeu est
 * toujours no-op.
 *
 * Cas particuliers :
 * - `pending_…` (placeholder — la création de session Stripe avait échoué et
 *   le rollback compensatoire a été interrompu) : annulé + restock direct ;
 * - session inconnue de Stripe (`resource_missing`) : idem ;
 * - session encore `open` : la cliente peut encore payer, on ne touche à rien.
 */
export async function reconcilePendingOrders(
	_prevState: ActionState | undefined,
	_formData: FormData,
): Promise<ActionState> {
	const admin = await requireAdmin();
	if ("error" in admin) return admin.error;

	try {
		const cutoff = new Date(Date.now() - PENDING_ORDER_RECONCILE_AGE_HOURS * 60 * 60 * 1000);
		const pendingOrders = await prisma.order.findMany({
			where: { status: "PENDING", createdAt: { lt: cutoff } },
			select: { id: true, stripeSessionId: true },
			orderBy: { createdAt: "asc" },
			take: RECONCILE_BATCH_SIZE,
		});

		if (pendingOrders.length === 0) {
			return success("Aucune commande en attente de plus de 24 h — tout est en ordre.");
		}

		let paid = 0;
		let cancelled = 0;
		let stillOpen = 0;
		const tags = new Set<string>();

		for (const order of pendingOrders) {
			// Vestige d'un échec de création de session : aucune session Stripe
			// n'existe, la réservation est forcément caduque.
			if (order.stripeSessionId.startsWith(PENDING_SESSION_PLACEHOLDER_PREFIX)) {
				const result = await cancelOrderFromExpiredSession(order.stripeSessionId);
				if (result.outcome === "transitioned") {
					cancelled += 1;
					for (const tag of result.tags) tags.add(tag);
				}
				continue;
			}

			let session: Stripe.Checkout.Session;
			try {
				session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
			} catch (e) {
				if (e instanceof Stripe.errors.StripeInvalidRequestError && e.code === "resource_missing") {
					const result = await cancelOrderFromExpiredSession(order.stripeSessionId);
					if (result.outcome === "transitioned") {
						cancelled += 1;
						for (const tag of result.tags) tags.add(tag);
					}
					continue;
				}
				throw e;
			}

			if (session.status === "complete" && session.payment_status === "paid") {
				const result = await markOrderPaidFromSession(session);
				if (result.outcome === "transitioned") {
					paid += 1;
					for (const tag of result.tags) tags.add(tag);
				}
			} else if (session.status === "expired") {
				const result = await cancelOrderFromExpiredSession(order.stripeSessionId);
				if (result.outcome === "transitioned") {
					cancelled += 1;
					for (const tag of result.tags) tags.add(tag);
				}
			} else {
				stillOpen += 1;
			}
		}

		if (tags.size > 0) {
			updateTagsAfterMutation(tags);
		}

		logger.info("[reconcilePendingOrders] Réconciliation terminée", {
			checked: pendingOrders.length,
			paid,
			cancelled,
			stillOpen,
		});

		const summary = `${pendingOrders.length} commande(s) vérifiée(s) : ${paid} confirmée(s), ${cancelled} annulée(s) avec stock restitué, ${stillOpen} encore ouverte(s).`;
		// Batch plein = il peut en rester au-delà des 25 traitées — sans cette
		// phrase, Léane croit la vérification terminée après un seul clic.
		return success(
			pendingOrders.length === RECONCILE_BATCH_SIZE
				? `${summary} Il peut en rester d'autres — clique à nouveau pour vérifier la suite.`
				: summary,
		);
	} catch (e) {
		return handleActionError(e, "La vérification des commandes en attente a échoué. Réessaie.");
	}
}
