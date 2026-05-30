import { RefundStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { BATCH_SIZE_MEDIUM } from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";

/**
 * AM-2 — boucle de réconciliation fermée pour la sur-facturation.
 *
 * Quand le webhook `payment_intent.succeeded` détecte qu'on a encaissé PLUS que
 * `Order.total` (Stripe `amount_received > total`), il persiste le trop-perçu
 * dans `Order.overbilledAmountCents` (sans auto-rembourser — Invariant 9
 * e-reporting : un refund auto créerait une transaction REFUND fantôme). Ce cron
 * quotidien ferme la boucle :
 *
 *  - **Auto-résolution** : si les refunds COMPLETED de la commande couvrent déjà
 *    le delta (l'admin a remboursé le trop-perçu via le flux refund normal), on
 *    pose `overbillingResolvedAt` → l'incident sort de la liste.
 *  - **Ré-alerte** : pour les sur-facturations encore non couvertes, on émet UNE
 *    alerte admin agrégée (1 mail/jour max via le bucket horaire de
 *    `sendAdminCronFailedAlert`) tant que le delta n'est pas remboursé.
 *
 * Lecture + mutation minimale (`overbillingResolvedAt`) — ne touche JAMAIS au
 * montant ni à l'e-reporting (le remboursement reste une décision admin manuelle).
 */
export async function alertOverbilledOrders(): Promise<CronResult> {
	logger.info("Scanning overbilled orders", { cronJob: "alert-overbilled-orders" });

	const candidates = await prisma.order.findMany({
		where: {
			overbilledAmountCents: { not: null },
			overbillingResolvedAt: null,
			...notDeleted,
		},
		select: {
			id: true,
			orderNumber: true,
			total: true,
			overbilledAmountCents: true,
		},
		take: BATCH_SIZE_MEDIUM,
		orderBy: { createdAt: "asc" },
	});

	if (candidates.length === 0) {
		logger.info("No overbilled orders to reconcile", { cronJob: "alert-overbilled-orders" });
		return { processed: 0, errored: 0, skipped: 0 };
	}

	let resolved = 0;
	let errored = 0;
	const stillUnresolved: Array<{ orderNumber: string; deltaCents: number }> = [];

	for (const order of candidates) {
		const delta = order.overbilledAmountCents ?? 0;
		try {
			// Somme des refunds COMPLETED de la commande : si ≥ delta, le trop-perçu
			// a été restitué (refund partiel manuel ou annulation totale).
			const completed = await prisma.refund.aggregate({
				where: { orderId: order.id, status: RefundStatus.COMPLETED, ...notDeleted },
				_sum: { amount: true },
			});
			const totalRefunded = completed._sum.amount ?? 0;

			if (totalRefunded >= delta) {
				await prisma.order.updateMany({
					where: { id: order.id, overbillingResolvedAt: null },
					data: { overbillingResolvedAt: new Date() },
				});
				resolved++;
				logger.info(`Overbilling auto-resolved on order ${order.orderNumber}`, {
					cronJob: "alert-overbilled-orders",
					orderId: order.id,
					deltaCents: delta,
					totalRefunded,
				});
			} else {
				stillUnresolved.push({ orderNumber: order.orderNumber, deltaCents: delta });
			}
		} catch (error) {
			errored++;
			logger.error("Failed to reconcile overbilled order", error, {
				cronJob: "alert-overbilled-orders",
				orderId: order.id,
				orderNumber: order.orderNumber,
			});
		}
	}

	// Ré-alerte agrégée (1 mail/jour max — bucket horaire de l'idempotencyKey).
	if (stillUnresolved.length > 0) {
		await sendAdminCronFailedAlert({
			job: "alert-overbilled-orders",
			errors: stillUnresolved.length,
			details: {
				issue: "unresolved-overbilling",
				count: stillUnresolved.length,
				orders: stillUnresolved.map(
					(o) => `${o.orderNumber} : trop-perçu ${(o.deltaCents / 100).toFixed(2)}€`,
				),
				hint: "Rembourser le delta via le flux refund normal (refund partiel) — PAS d'avoir automatique (Invariant 9 e-reporting). Le cron auto-résout dès que le refund est COMPLETED.",
			},
		}).catch((e) =>
			logger.error("Failed to send overbilling re-alert", e, {
				cronJob: "alert-overbilled-orders",
			}),
		);
	}

	logger.info("Overbilling reconciliation completed", {
		cronJob: "alert-overbilled-orders",
		resolved,
		unresolved: stillUnresolved.length,
		errored,
	});

	return {
		processed: resolved,
		errored,
		skipped: stillUnresolved.length,
		hasMore: candidates.length === BATCH_SIZE_MEDIUM,
	};
}
