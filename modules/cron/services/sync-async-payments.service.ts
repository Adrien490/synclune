import type Stripe from "stripe";
import { revalidateTagsInBackground } from "@/shared/lib/cache";
import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { getStripeClient } from "@/shared/lib/stripe";
import {
	markOrderAsFailed,
	extractPaymentFailureDetails,
	restoreStockForOrder,
} from "@/modules/webhooks/services/payment-intent.service";
import { processOrderFromPaymentIntent } from "@/modules/webhooks/services/checkout.service";
import { buildPostCheckoutTasksFromPI } from "@/modules/webhooks/services/checkout-post-tasks.service";
import { executePostWebhookTasks } from "@/modules/webhooks/services/execute-post-webhook-tasks.service";
import type { PostWebhookTask } from "@/modules/webhooks/types/webhook.types";
import { ensureInvoiceNumberPersisted } from "@/modules/orders/services/ensure-invoice-number.service";
import { extractPaymentDetailsFromPaymentIntent } from "@/modules/payments/services/map-stripe-payment-method";
import { ORDERS_CACHE_TAGS, getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import {
	collectStockInvalidationTags,
	type StockChangedSku,
} from "@/modules/products/utils/cache.utils";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import {
	BATCH_DEADLINE_MS,
	BATCH_SIZE_MEDIUM,
	STRIPE_THROTTLE_MS,
	STRIPE_TIMEOUT_MS,
	THRESHOLDS,
} from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";
import { sendPaymentFailedEmail } from "@/modules/emails/services/payment-emails";
import { getBaseUrl, ROUTES } from "@/shared/constants/urls";

/**
 * Synchronizes async payment statuses by polling Stripe.
 *
 * Async payment methods (SEPA Direct Debit, Sofort, etc.) can take
 * 3-5 business days to confirm. This cron polls Stripe to reconcile
 * statuses in case of webhook failure.
 */
export async function syncAsyncPayments(): Promise<CronResult> {
	logger.info("Starting async payment sync", { cronJob: "sync-async-payments" });

	const stripe = getStripeClient();
	if (!stripe) {
		logger.warn("STRIPE_SECRET_KEY not configured — skipping run", {
			cronJob: "sync-async-payments",
		});
		return {
			processed: 0,
			errored: 0,
			skipped: 1,
			reason: "STRIPE_KEY_MISSING",
		};
	}

	// Find PENDING orders with a PI, older than 1h.
	// F4 (2026-05-29) : la borne haute (10 jours) a été retirée. Elle laissait
	// figer définitivement une commande dont le PI passe `succeeded` après J+10
	// avec un webhook raté = débit encaissé sans Order traitée, sans facture
	// (viole l'émission à l'encaissement, Art. 289-I CGI). Le pool reste borné
	// car la branche F1 (cancel + FAILED des PI durablement non finalisés) draine
	// les PENDING abandonnés ; on traite les plus anciens d'abord (les plus à risque).
	const minAge = new Date(Date.now() - THRESHOLDS.ASYNC_PAYMENT_MIN_AGE_MS);

	const pendingOrders = await prisma.order.findMany({
		where: {
			paymentStatus: PaymentStatus.PENDING,
			stripePaymentIntentId: { not: null },
			createdAt: {
				lt: minAge,
			},
			...notDeleted,
		},
		select: {
			id: true,
			orderNumber: true,
			stripePaymentIntentId: true,
			paymentStatus: true,
			// CACHE-AUDIT-004 : nécessaire pour invalider les tags user-scopés.
			// P2-1 : notifier le client à l'échec/abandon — ce cron est l'unique
			// émetteur de l'email payment-failed (le webhook payment_failed est
			// non-terminal et n'envoie rien, cf. handlePaymentFailure).
			customerEmail: true,
			customerName: true,
		},
		take: BATCH_SIZE_MEDIUM,
		orderBy: { createdAt: "asc" },
	});

	logger.info("Found pending orders to check", {
		cronJob: "sync-async-payments",
		count: pendingOrders.length,
	});

	let updated = 0;
	let errors = 0;
	const deadline = Date.now() + BATCH_DEADLINE_MS;
	const tagsToInvalidate = new Set<string>();
	const stockRestoreFailures: Array<{
		orderId: string;
		orderNumber: string;
		error: string;
	}> = [];

	// Webhook raté : un PI confirmé `succeeded` qu'on rejoue via le même chemin
	// que le webhook (décrément stock + désactivation SKU + clear cart + facture).
	// Idempotent via le guard `paymentStatus === "PAID"`.
	const processPaidOrder = async (orderId: string, pi: Stripe.PaymentIntent): Promise<void> => {
		// ⚠️ C'est ICI que la date d'encaissement Stripe compte le plus : cette tâche
		// est MANUELLE (page Maintenance), donc elle peut rattraper un paiement
		// vieux de plusieurs jours. Poser l'horloge du run mettrait cette recette à
		// la date du clic — faux dans le livre de recettes, et faux sur la facture.
		const captured = await extractPaymentDetailsFromPaymentIntent(pi);
		const order = await processOrderFromPaymentIntent(orderId, pi, captured);
		await ensureInvoiceNumberPersisted(orderId);
		// CACHE-AUDIT-004 : détail commande (plus de tags user-scopés — cf. cache.ts).
		for (const tag of getOrderInvalidationTags(orderId)) {
			tagsToInvalidate.add(tag);
		}

		// WEBHOOK-AUDIT-003 : ce chemin rejouait le stock, la facture et l'e-reporting
		// mais N'ÉMETTAIT AUCUNE confirmation de commande — or c'est précisément le
		// chemin emprunté quand le webhook est définitivement perdu. Le client était
		// donc débité et servi sans jamais recevoir de confirmation. On reconstruit les
		// mêmes post-tasks que le webhook via le SSOT `buildPostCheckoutTasksFromPI`,
		// ce qui récupère au passage les tags panier + stock/produit que la boucle
		// ci-dessus n'invalidait pas.
		const tasks = buildPostCheckoutTasksFromPI(order, pi);
		const emailTasks: PostWebhookTask[] = [];
		for (const task of tasks) {
			if (task.type === "INVALIDATE_CACHE") {
				// Le cron a déjà son propre mécanisme de flush en fin de run : inutile
				// d'exécuter la tâche telle quelle, l'invalidation part immédiatement.
				for (const tag of task.tags) tagsToInvalidate.add(tag);
			} else {
				emailTasks.push(task);
			}
		}
		if (emailTasks.length > 0) {
			// Exécution DIRECTE (Lot 2 S3.4 — la file PostWebhookTask a été retirée).
			// Un webhook arrivé entre-temps, ou un run précédent, ne produit pas de
			// second email : la clé d'idempotence Resend `order-confirm-${orderId}`
			// (24 h cross-instance) dédoublonne, comme elle le faisait déjà sous la file.
			await executePostWebhookTasks(emailTasks);
		}
	};

	// Échec/abandon paiement : markOrderAsFailed (gardé anti-PAID) D'ABORD, puis
	// restore stock. Audit webhooks 2026-07-02 : l'ancien ordre (OPS-AUDIT-003,
	// restore d'abord) restockait AVANT de savoir si la transition était permise —
	// si le PI passait `succeeded` entre le retrieve du cron et le failOrder
	// (client finalisant son paiement), on restockait une commande devenue PAYÉE
	// (restock fantôme). Désormais `transitioned: false` ⇒ return early sans
	// restore ni email (le webhook succeeded ou la branche `succeeded` du prochain
	// run fait foi). Le restore post-transition est un no-op de fait (une
	// PENDING→FAILED implique stock jamais décrémenté) — conservé en
	// ceinture-bretelles ; s'il throw, la commande est déjà FAILED et le stock
	// n'a rien à rendre, on logge sans re-PENDING.
	const failOrder = async (
		orderId: string,
		piId: string,
		pi: Stripe.PaymentIntent,
	): Promise<
		| { ok: true; transitioned: boolean; restoredSkus: StockChangedSku[] }
		| { ok: false; error: string }
	> => {
		const { transitioned } = await markOrderAsFailed(
			orderId,
			piId,
			extractPaymentFailureDetails(pi),
		);
		if (!transitioned) {
			return { ok: true, transitioned: false, restoredSkus: [] };
		}
		try {
			const stockResult = await restoreStockForOrder(orderId);
			return { ok: true, transitioned: true, restoredSkus: stockResult.restoredSkus };
		} catch (stockError) {
			return {
				ok: false,
				error: stockError instanceof Error ? stockError.message : String(stockError),
			};
		}
	};

	for (const order of pendingOrders) {
		if (Date.now() > deadline) {
			logger.warn("Approaching timeout, stopping batch early", { cronJob: "sync-async-payments" });
			break;
		}
		if (!order.stripePaymentIntentId) continue;

		try {
			// Throttle every call (uniform pacing, cap burst at 1/STRIPE_THROTTLE_MS req/s).
			await new Promise((resolve) => setTimeout(resolve, STRIPE_THROTTLE_MS));
			const paymentIntent = await stripe.paymentIntents.retrieve(
				order.stripePaymentIntentId,
				undefined,
				{
					timeout: STRIPE_TIMEOUT_MS,
				},
			);

			const status = paymentIntent.status;

			if (status === "succeeded") {
				// Payment succeeded but webhook was missed (ORD-STRIPE-001).
				logger.info("Order payment succeeded (webhook missed)", {
					cronJob: "sync-async-payments",
					orderNumber: order.orderNumber,
				});
				await processPaidOrder(order.id, paymentIntent);
				updated++;
				continue;
			}

			// F1 (2026-05-29) : un PI durablement non finalisé — 3DS abandonné
			// (`requires_action`) ou jamais confirmé (`requires_confirmation`) —
			// n'émet aucun webhook terminal. Le cron ne sélectionnant que des
			// commandes > 1h (ASYNC_PAYMENT_MIN_AGE_MS), un tel PI est abandonné :
			// on l'annule côté Stripe AVANT de marquer FAILED, sinon un client qui
			// revient finaliser le 3DS plus tard provoquerait un débit surprise sur
			// une commande déjà annulée (rattrapé seulement par detectCancelledOrderRace
			// + auto-refund). Sans ce correctif, ces commandes restaient PENDING
			// indéfiniment au-delà de la fenêtre de poll.
			// Audit webhooks 2026-07-02 : `requires_payment_method` ajouté — depuis
			// que payment_failed est non-terminal (handlePaymentFailure observabilité
			// seule), c'est CE cron qui acte l'échec d'un refus carte abandonné ; sans
			// cancel du PI, un client revenant à H+1h05 re-confirmait le même PI
			// vivant → succeeded sur commande CANCELLED → débit + auto-refund.
			if (
				status === "requires_action" ||
				status === "requires_confirmation" ||
				status === "requires_payment_method"
			) {
				try {
					await stripe.paymentIntents.cancel(order.stripePaymentIntentId);
				} catch (cancelError) {
					// Race : le PI a pu passer `succeeded` entre le retrieve et le cancel.
					const fresh = await stripe.paymentIntents.retrieve(
						order.stripePaymentIntentId,
						undefined,
						{
							timeout: STRIPE_TIMEOUT_MS,
						},
					);
					if (fresh.status === "succeeded") {
						logger.info("PI succeeded during cancel race — processing as paid", {
							cronJob: "sync-async-payments",
							orderNumber: order.orderNumber,
						});
						await processPaidOrder(order.id, fresh);
						updated++;
						continue;
					}
					logger.error("Failed to cancel stale PI — order kept PENDING for next run", cancelError, {
						cronJob: "sync-async-payments",
						orderNumber: order.orderNumber,
						orderId: order.id,
					});
					errors++;
					continue;
				}
			}

			if (
				status === "canceled" ||
				status === "requires_payment_method" ||
				status === "requires_action" ||
				status === "requires_confirmation"
			) {
				logger.info("Order payment failed/abandoned", {
					cronJob: "sync-async-payments",
					orderNumber: order.orderNumber,
					stripeStatus: status,
				});
				const result = await failOrder(order.id, order.stripePaymentIntentId, paymentIntent);
				if (!result.ok) {
					// La transition FAILED a eu lieu mais le restore (no-op attendu) a
					// throw — incident DB à investiguer, la commande reste FAILED.
					logger.error("Stock restore failed after FAILED transition", undefined, {
						cronJob: "sync-async-payments",
						orderNumber: order.orderNumber,
						orderId: order.id,
					});
					stockRestoreFailures.push({
						orderId: order.id,
						orderNumber: order.orderNumber,
						error: result.error,
					});
					errors++;
					continue;
				}
				if (!result.transitioned) {
					// Garde anti-PAID : le PI a été payé/traité entre le retrieve et le
					// failOrder (ou un run concurrent a déjà FAILED). Ne pas envoyer
					// l'email d'échec ni compter la commande — l'état réel fait foi.
					logger.info("Order no longer failable — skipping (paid or already failed)", {
						cronJob: "sync-async-payments",
						orderNumber: order.orderNumber,
						orderId: order.id,
					});
					continue;
				}
				// CACHE-CATALOG-002 : restock ⇒ invalider aussi la page produit +
				// inventaire admin, pas seulement SKU_STOCK.
				for (const tag of collectStockInvalidationTags(result.restoredSkus)) {
					tagsToInvalidate.add(tag);
				}
				// CACHE-AUDIT-004 : détail commande (plus de tags user-scopés — cf. cache.ts).
				for (const tag of getOrderInvalidationTags(order.id)) {
					tagsToInvalidate.add(tag);
				}
				// P2-1 : notifier le client (paiement non finalisé / refus carte / 3DS
				// abandonné). Depuis l'audit webhooks 2026-07-02, ce cron est l'UNIQUE
				// émetteur de cet email (handlePaymentFailure est non-terminal et
				// n'envoie plus rien) — il part au moment où l'échec est acté (> 1h,
				// client parti), pas pendant que le client retente sa carte.
				// Best-effort — un échec d'email ne doit jamais faire échouer le cron ni
				// re-PENDING la commande (déjà FAILED). idempotencyKey conservée
				// (`payment-failed-${orderId}`) : dédup Resend 24h sur les runs successifs.
				if (order.customerEmail) {
					try {
						await sendPaymentFailedEmail({
							to: order.customerEmail,
							customerName: order.customerName,
							orderNumber: order.orderNumber,
							retryUrl: `${getBaseUrl()}${ROUTES.SHOP.CHECKOUT}`,
							idempotencyKey: `payment-failed-${order.id}`,
						});
					} catch (emailError) {
						logger.error("Failed to send payment-failed email", emailError, {
							cronJob: "sync-async-payments",
							orderNumber: order.orderNumber,
							orderId: order.id,
						});
					}
				}
				updated++;
				continue;
			}
			// Autres statuts (`processing`) : paiement réellement en cours côté
			// banque → laissé PENDING, repris au prochain run.
		} catch (error) {
			logger.error("Error checking order", error, {
				cronJob: "sync-async-payments",
				orderNumber: order.orderNumber,
			});
			errors++;
		}
	}

	// Invalidate caches if any orders were updated
	if (updated > 0) {
		tagsToInvalidate.add(ORDERS_CACHE_TAGS.LIST);
		tagsToInvalidate.add(SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST);
		tagsToInvalidate.add(SHARED_CACHE_TAGS.ADMIN_BADGES);
		revalidateTagsInBackground(tagsToInvalidate);
	}

	// Emit a single aggregated alert for all stock-restore failures (avoid per-order inbox spam)
	if (stockRestoreFailures.length > 0) {
		sendAdminCronFailedAlert({
			job: "sync-async-payments",
			errors: stockRestoreFailures.length,
			details: {
				issue: "stock-restore-failed",
				failures: stockRestoreFailures,
			},
		}).catch((e) =>
			logger.error("Failed to send stock restore alert", e, {
				cronJob: "sync-async-payments",
			}),
		);
	}

	logger.info("Sync completed", { cronJob: "sync-async-payments", updated, errors });

	return {
		processed: updated,
		errored: errors,
		skipped: Math.max(0, pendingOrders.length - updated - errors),
		checked: pendingOrders.length,
		updated,
		errors,
		hasMore: pendingOrders.length === BATCH_SIZE_MEDIUM,
	};
}
