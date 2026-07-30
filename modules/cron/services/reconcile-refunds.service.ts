import { updateTag } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import {
	HistorySource,
	InvoiceStatus,
	OrderAction,
	PaymentStatus,
	RefundStatus,
	StockMovementSource,
} from "@/app/generated/prisma/client";
import { recordStockMovementTx } from "@/modules/skus/services/stock-movement.service";
import { shouldReactivateAfterRestock } from "@/modules/skus/services/restock-reactivation.service";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { getStripeClient } from "@/shared/lib/stripe";
import {
	BATCH_DEADLINE_MS,
	BATCH_SIZE_MEDIUM,
	STRIPE_THROTTLE_MS,
	STRIPE_TIMEOUT_MS,
	THRESHOLDS,
} from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";
import { ORDERS_CACHE_TAGS, getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { REFUNDS_CACHE_TAGS } from "@/modules/refunds/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { canTransition } from "@/modules/refunds/services/refund-state-machine.service";
import { captureRefundError } from "@/modules/refunds/utils/capture-refund-error";
import { createOrderAuditTx } from "@/modules/orders/utils/order-audit";
import { sendRefundConfirmationOnce } from "@/modules/refunds/services/send-refund-confirmation.service";
import { issueCreditNoteForRefund } from "@/modules/refunds/services/issue-credit-note.service";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
import { voidInvoice } from "@/modules/orders/services/void-invoice.service";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { SYSTEM_AUTHOR_ID } from "@/modules/webhooks/constants/webhook.constants";
import {
	AUTO_REFUND_NOTE_PREFIX,
	initiateAutomaticRefund,
	sendRefundFailureAlert,
} from "@/modules/webhooks/services/payment-intent.service";

const RECONCILE_AUDIT_AUTHOR = "Système (reconcile-refunds)";

/**
 * AM-1 — nombre max de tentatives de (re)création Stripe d'un auto-refund dont
 * le premier `stripe.refunds.create` a échoué (panne Stripe transitoire). Au-delà,
 * on arrête de retenter et on alerte l'admin pour intervention manuelle (le client
 * est débité, l'argent doit être restitué). Borne anti-boucle si l'échec est
 * permanent (PI non remboursable, charge déjà remboursée hors-bande, etc.).
 */
const AUTO_REFUND_MAX_CREATE_ATTEMPTS = 5;

/**
 * DLQ refund reconciler.
 *
 * Picks up refunds where the SAGA `processRefund` Step 3 (DB finalization)
 * failed after Step 2 (Stripe call succeeded). Such refunds are stuck in
 * status APPROVED with `stripeRefundId IS NOT NULL AND processedAt IS NULL`.
 * Without this cron, the order `paymentStatus` would never transition to
 * REFUNDED / PARTIALLY_REFUNDED even though Stripe successfully refunded
 * the customer — accounting drift + comptabilité incorrecte (audit TVA risk).
 *
 * Strategy :
 * 1. Find candidate refunds (APPROVED, stripeRefundId set, no processedAt,
 *    last 7 days to bound the scan window).
 * 2. For each : retrieve Stripe refund status. If `succeeded` → finalize
 *    locally (transaction : COMPLETED + processedAt + order paymentStatus).
 *    If `pending` → skip (the webhook will eventually finalize).
 *    If `failed` → mark FAILED locally (idempotent with webhook).
 * 3. Idempotent : guard `status: APPROVED` on each update — concurrent
 *    webhook reconciliation never collides.
 */
export async function reconcileRefunds(): Promise<CronResult> {
	logger.info("Starting refund reconciliation", { cronJob: "reconcile-refunds" });

	const stripe = getStripeClient();
	if (!stripe) {
		logger.warn("STRIPE_SECRET_KEY not configured — skipping run", {
			cronJob: "reconcile-refunds",
		});
		return {
			processed: 0,
			errored: 0,
			skipped: 1,
			reason: "STRIPE_KEY_MISSING",
		};
	}

	// Scan window : 90 jours, avec au moins REFUND_RECONCILE_MIN_AGE_MS (1h) de
	// quarantine pour laisser le webhook path finaliser en premier.
	// EINV-CREDIT-009 : élargi 7j→90j pour couvrir les incidents production
	// prolongés (panne BDD, pause cron prolongée) où un Refund peut rester
	// stuck en APPROVED+stripeRefundId+processedAt=null pendant plusieurs
	// semaines sans rattrapage. Au-delà de 90j : procédure manuelle.
	const now = Date.now();
	const maxAge = new Date(now - 90 * 24 * 60 * 60 * 1000);
	const minAge = new Date(now - THRESHOLDS.REFUND_RECONCILE_MIN_AGE_MS);

	const candidates = await prisma.refund.findMany({
		where: {
			status: RefundStatus.APPROVED,
			stripeRefundId: { not: null },
			processedAt: null,
			createdAt: { gte: maxAge, lt: minAge },
			...notDeleted,
		},
		select: {
			id: true,
			stripeRefundId: true,
			amount: true,
			orderId: true,
			// ORD-STRIPE-007 : reason + customerEmail/Name nécessaires pour
			// envoyer le mail confirmation client après finalisation DLQ.
			reason: true,
			attemptCount: true,
			order: {
				select: {
					id: true,
					orderNumber: true,
					total: true,
					userId: true,
					customerEmail: true,
					customerName: true,
				},
			},
		},
		take: BATCH_SIZE_MEDIUM,
		orderBy: { createdAt: "asc" },
	});

	logger.info("Found refund candidates", {
		cronJob: "reconcile-refunds",
		count: candidates.length,
	});

	// EINV-CREDIT-009 : alerte Sentry P1 si on atteint le batch max — indique
	// soit un backlog anormal (incident production prolongé), soit un bug
	// systémique (webhook charge.refunded en panne durable). Cas normal : on
	// pick quelques unités/jour, jamais BATCH_SIZE_MEDIUM (=25).
	if (candidates.length === BATCH_SIZE_MEDIUM) {
		Sentry.withScope((scope) => {
			scope.setLevel("warning");
			scope.setTag("cron", "reconcile-refunds");
			scope.setTag("anomaly", "batch-saturated");
			scope.setFingerprint(["reconcile-refunds", "batch-saturated"]);
			scope.setContext("reconcile", {
				batchSize: BATCH_SIZE_MEDIUM,
				windowDays: 90,
			});
			Sentry.captureMessage(
				`reconcile-refunds picked ${BATCH_SIZE_MEDIUM} candidates (batch saturated — system anomaly)`,
				"warning",
			);
		});
	}

	let processed = 0;
	let errored = 0;
	let skipped = 0;
	const deadline = Date.now() + BATCH_DEADLINE_MS;
	const tagsToInvalidate = new Set<string>();

	for (const refund of candidates) {
		// Lu une fois : le numéro de commande sert dans 5 contextes Sentry/logs de
		// cette itération.
		const orderNumber = refund.order.orderNumber;
		if (Date.now() > deadline) {
			logger.warn("Approaching timeout, stopping batch early", {
				cronJob: "reconcile-refunds",
			});
			break;
		}
		if (!refund.stripeRefundId) {
			skipped++;
			continue;
		}

		try {
			// Throttle every call (uniform pacing, cap burst at 1/STRIPE_THROTTLE_MS req/s).
			await new Promise((resolve) => setTimeout(resolve, STRIPE_THROTTLE_MS));

			const stripeRefund = await stripe.refunds.retrieve(refund.stripeRefundId, undefined, {
				timeout: STRIPE_TIMEOUT_MS,
			});

			if (stripeRefund.status === "succeeded") {
				const finalized = await finalizeRefund({
					refundId: refund.id,
					orderId: refund.orderId,
					orderTotal: refund.order.total,
					refundAmount: refund.amount,
				});
				if (finalized.finalized) {
					processed++;
					tagsToInvalidate.add(REFUNDS_CACHE_TAGS.DETAIL(refund.id));
					tagsToInvalidate.add(ORDERS_CACHE_TAGS.REFUNDS(refund.orderId));
					// CACHE-AUDIT-010 : finalizeRefund mute Order.paymentStatus — passer
					// par le helper canonique pour couvrir DETAIL/HISTORY/CONFIRMATION(orderId)
					// + LAST_ORDER/USER_ORDERS_COUNT, sinon la page détail
					// commande + l'historique restent stale après le rattrapage DLQ.
					for (const tag of getOrderInvalidationTags(
						refund.order.userId ?? undefined,
						refund.orderId,
					)) {
						tagsToInvalidate.add(tag);
					}

					// P2-1 (audit refunds 2026-05-30) : invalidation caches inventaire /
					// vitrine pour les SKU restockés par
					// finalizeRefund (parité process-refund Step 3). Le cron DLQ est le
					// finaliseur réel des refunds admin dont le SAGA a échoué, donc c'est
					// lui qui restaure réellement l'inventory.
					if (finalized.restockedSkuIds.length > 0) {
						tagsToInvalidate.add(SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST);
						for (const skuId of finalized.restockedSkuIds) {
							tagsToInvalidate.add(PRODUCTS_CACHE_TAGS.SKU_STOCK(skuId));
						}
						const restockedSkus = await prisma.productSku.findMany({
							where: { id: { in: finalized.restockedSkuIds } },
							select: { productId: true, product: { select: { slug: true } } },
						});
						for (const productId of new Set(restockedSkus.map((sku) => sku.productId))) {
							tagsToInvalidate.add(PRODUCTS_CACHE_TAGS.SKUS(productId));
						}
						for (const slug of new Set(restockedSkus.map((sku) => sku.product.slug))) {
							tagsToInvalidate.add(PRODUCTS_CACHE_TAGS.DETAIL(slug));
						}
					}

					// EINV-CREDIT-001 : rattrapage avoir si l'admin path a abort
					// avant l'émission. Idempotent (noop si creditNoteNumber set).
					const creditNoteResult = await issueCreditNoteForRefund({
						refundId: refund.id,
						source: HistorySource.SYSTEM,
						authorName: RECONCILE_AUDIT_AUTHOR,
					});
					if (creditNoteResult.kind === "failed") {
						logger.warn(
							`reconcile-refunds — credit note emission failed for refund ${refund.id}: ${creditNoteResult.error}`,
							{ cronJob: "reconcile-refunds", refundId: refund.id },
						);
					}

					// P2-2 (audit refunds 2026-05-30) : refund TOTAL finalisé par le cron
					// → voidInvoice fallback (idempotent). issueCreditNoteForRefund noop
					// sur un full refund (defer voidInvoice, EINV-SEQ-001). Sans ce
					// fallback, l'avoir d'annulation (Order.creditNoteNumber) dépend
					// uniquement du webhook charge.refunded — perdu en cas de double
					// panne → facture stale (Art. 272-I CGI).
					if (finalized.isFullyRefunded) {
						const invoiceState = await prisma.order.findUnique({
							where: { id: refund.orderId },
							select: { invoiceStatus: true, invoiceNumber: true },
						});
						if (
							invoiceState?.invoiceStatus === InvoiceStatus.GENERATED &&
							invoiceState.invoiceNumber
						) {
							const voided = await voidInvoice({
								orderId: refund.orderId,
								authorId: SYSTEM_AUTHOR_ID,
								authorName: RECONCILE_AUDIT_AUTHOR,
								source: HistorySource.SYSTEM,
								reason: "Avoir émis suite à remboursement total (réconciliation DLQ)",
							});
							if (voided.kind === "failed") {
								Sentry.withScope((scope) => {
									scope.setLevel("error");
									scope.setTag("invoicing", "void-invoice-failed");
									scope.setTag("source", "reconcile-refunds");
									scope.setFingerprint(["void-invoice", "max-retries", refund.orderId]);
									scope.setContext("order", {
										orderId: refund.orderId,
										orderNumber,
									});
									Sentry.captureMessage(
										"voidInvoice failed during DLQ reconcile (full refund) — facture stale",
										"error",
									);
								});
							}
						}
					}

					// ORD-STRIPE-005 : émetteur centralisé. Pose
					// `Refund.confirmationEmailSentAt` atomiquement — si admin SAGA
					// ou webhook `charge.refunded` a déjà envoyé, on skip silencieusement.
					if (refund.order.customerEmail) {
						const orderDetailsUrl = buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(refund.orderId));
						try {
							// Re-fetch post-émission : l'avoir (issueCreditNoteForRefund /
							// voidInvoice ci-dessus) vient d'être écrit — l'email doit
							// porter les numéros de pièces comme le path admin.
							const refundFacts = await prisma.refund.findUnique({
								where: { id: refund.id },
								select: {
									creditNoteNumber: true,
									order: { select: { invoiceNumber: true, creditNoteNumber: true } },
								},
							});
							await sendRefundConfirmationOnce({
								refundId: refund.id,
								to: refund.order.customerEmail,
								orderNumber,
								customerName: refund.order.customerName || "Client",
								refundAmount: refund.amount,
								reason: refund.reason,
								orderDetailsUrl,
								invoiceNumber: refundFacts?.order.invoiceNumber ?? null,
								creditNoteNumber:
									refundFacts?.creditNoteNumber ?? refundFacts?.order.creditNoteNumber ?? null,
							});
						} catch (emailError) {
							logger.error(
								"Failed to send refund confirmation email after DLQ reconcile",
								emailError,
								{
									cronJob: "reconcile-refunds",
									refundId: refund.id,
									orderNumber,
								},
							);
							// Non-bloquant : refund finalisé en DB, alerte admin
							// via Sentry mais cron continue.
							captureRefundError(emailError, {
								action: "reconcile-refunds-email",
								refundId: refund.id,
								stripeRefundId: refund.stripeRefundId,
								orderId: refund.orderId,
								orderNumber,
							});
						}
					}
				} else {
					skipped++;
				}
			} else if (stripeRefund.status === "failed") {
				const failureReason = stripeRefund.failure_reason ?? "unknown";
				const failed = await prisma.$transaction(async (tx) => {
					const updated = await tx.refund.updateMany({
						where: { id: refund.id, status: RefundStatus.APPROVED },
						data: { status: RefundStatus.FAILED, failureReason },
					});
					if (updated.count === 0) return false;

					await createOrderAuditTx(tx, {
						orderId: refund.orderId,
						action: OrderAction.REFUND_FAILED,
						source: HistorySource.SYSTEM,
						authorName: RECONCILE_AUDIT_AUTHOR,
						note: `Refund failed via Stripe DLQ reconciliation (${failureReason})`,
						metadata: {
							refundId: refund.id,
							stripeRefundId: refund.stripeRefundId,
							amount: refund.amount,
							failureReason,
							reason: "stripe_dlq_reconcile",
						},
					});
					return true;
				});

				if (failed) {
					processed++;
					tagsToInvalidate.add(REFUNDS_CACHE_TAGS.DETAIL(refund.id));
				} else {
					skipped++;
				}
			} else {
				// pending / requires_action → laisser le webhook ou le prochain run gérer
				skipped++;
			}
		} catch (error) {
			logger.error("Error reconciling refund", error, {
				cronJob: "reconcile-refunds",
				refundId: refund.id,
				stripeRefundId: refund.stripeRefundId,
			});
			captureRefundError(error, {
				action: "reconcile-refunds",
				refundId: refund.id,
				stripeRefundId: refund.stripeRefundId,
				orderId: refund.orderId,
				orderNumber,
			});
			errored++;
		}
	}

	// AM-1 — 2ᵉ phase : repêche les auto-refunds dont la *création* Stripe a
	// échoué (APPROVED + stripeRefundId NULL). Le filet principal ci-dessus exige
	// `stripeRefundId NOT NULL`, donc ces refunds n'étaient sinon jamais retentés —
	// client débité (oversell / payment_failed) sans remboursement émis.
	const retryStats = await retryStuckAutoRefundCreations({ minAge, maxAge, deadline });
	processed += retryStats.retried;
	errored += retryStats.errored;
	skipped += retryStats.skipped;

	// OVERBILL-RESOLVE-01 : auto-résolution de la sur-facturation. Reprend la
	// moitié « résolution » de l'ex-cron alert-overbilled-orders (supprimé au
	// right-sizing) — qui était le SEUL writer de Order.overbillingResolvedAt.
	// Sans ce rattrapage, une commande sur-facturée puis remboursée resterait
	// affichée « à traiter » sur le dashboard à vie (compteur monotone, cry-wolf).
	// La ré-alerte email n'est PAS restaurée : la surveillance est passée en PULL
	// (dashboard get-action-items). Lecture + mutation minimale, jamais le montant.
	const overbillStats = await reconcileOverbilledOrders();
	processed += overbillStats.resolved;
	errored += overbillStats.errored;
	for (const tag of overbillStats.tags) {
		tagsToInvalidate.add(tag);
	}

	if (tagsToInvalidate.size > 0) {
		tagsToInvalidate.add(REFUNDS_CACHE_TAGS.LIST);
		tagsToInvalidate.add(ORDERS_CACHE_TAGS.LIST);
		tagsToInvalidate.add(SHARED_CACHE_TAGS.ADMIN_BADGES);
		tagsToInvalidate.add(SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST);
		for (const tag of tagsToInvalidate) {
			updateTag(tag);
		}
	}

	logger.info("Reconciliation completed", {
		cronJob: "reconcile-refunds",
		processed,
		errored,
		skipped,
	});

	return {
		processed,
		errored,
		skipped,
		hasMore: candidates.length === BATCH_SIZE_MEDIUM,
	};
}

/**
 * OVERBILL-RESOLVE-01 — auto-résolution de la sur-facturation.
 *
 * Le webhook `payment_intent.succeeded` persiste `Order.overbilledAmountCents`
 * quand Stripe encaisse plus que `order.total` (sans auto-rembourser — Invariant 9
 * e-reporting). Le dashboard (`get-action-items`) liste ces commandes tant que
 * `overbillingResolvedAt IS NULL`. Cette passe pose `overbillingResolvedAt` dès que
 * les refunds COMPLETED de la commande couvrent le delta (l'admin a remboursé le
 * trop-perçu via le flux refund normal) — quel que soit le chemin de complétion
 * (webhook `charge.refunded`, action `processRefund`, ou la phase 1 de ce cron).
 *
 * Reprend la moitié « résolution » de l'ex-cron `alert-overbilled-orders` (supprimé
 * au right-sizing), qui en était l'unique writer. La ré-alerte email n'est PAS
 * restaurée (monitoring passé en PULL). Lecture + `overbillingResolvedAt` seulement —
 * jamais le montant ni l'e-reporting (le remboursement reste une décision admin).
 */
async function reconcileOverbilledOrders(): Promise<{
	resolved: number;
	errored: number;
	tags: string[];
}> {
	const candidates = await prisma.order.findMany({
		where: {
			overbilledAmountCents: { not: null },
			overbillingResolvedAt: null,
			...notDeleted,
		},
		select: { id: true, orderNumber: true, total: true, overbilledAmountCents: true, userId: true },
		take: BATCH_SIZE_MEDIUM,
		orderBy: { createdAt: "asc" },
	});

	if (candidates.length === 0) return { resolved: 0, errored: 0, tags: [] };

	let resolved = 0;
	let errored = 0;
	// CACHE : la résolution change la fiche commande admin + le dashboard
	// « À traiter » — invalider les tags par-commande/user via le helper SSOT,
	// pas seulement les listes globales (sinon stale ~10 min profil `user`).
	const tags = new Set<string>();

	for (const order of candidates) {
		const delta = order.overbilledAmountCents ?? 0;
		try {
			const completedRefunds = await prisma.refund.findMany({
				where: { orderId: order.id, status: RefundStatus.COMPLETED, ...notDeleted },
				select: { amount: true },
			});
			const totalRefunded = completedRefunds.reduce((sum, r) => sum + r.amount, 0);

			// OVERBILL-RESOLVE-02 : un simple `totalRefunded >= delta` marquait
			// « résolu » dès qu'un refund quelconque (retour produit, geste commercial)
			// atteignait le delta, sans que le trop-perçu ait été restitué en tant que
			// tel. Aucun lien causal refund↔overbilling n'existe en DB (les refunds
			// Dashboard sont ré-alloués au pro-rata des items, la raison n'est pas
			// discriminante, et tout refund est postérieur à la détection) — on retient
			// donc deux signaux sans faux positif :
			//   (a) un refund COMPLETED du montant EXACT du delta — le workflow
			//       instruit par l'alerte admin (« remboursement manuel du delta ») ;
			//   (b) cumul >= order.total + delta — les refunds produits ne peuvent
			//       excéder order.total, donc le delta est nécessairement restitué.
			// Faux négatif possible (delta remboursé en plusieurs fois) : la commande
			// reste visible sur le dashboard « À traiter », jamais résolue à tort.
			const hasExactDeltaRefund = completedRefunds.some((r) => r.amount === delta);
			const isEverythingRefunded = totalRefunded >= order.total + delta;

			if (hasExactDeltaRefund || isEverythingRefunded) {
				// Guard `overbillingResolvedAt: null` → idempotent (pas de double-résolution
				// si deux runs se chevauchent).
				const { count } = await prisma.order.updateMany({
					where: { id: order.id, overbillingResolvedAt: null },
					data: { overbillingResolvedAt: new Date() },
				});
				if (count > 0) {
					resolved++;
					for (const tag of getOrderInvalidationTags(order.userId ?? undefined, order.id)) {
						tags.add(tag);
					}
					logger.info(`Overbilling auto-resolved on order ${order.orderNumber}`, {
						cronJob: "reconcile-refunds",
						orderId: order.id,
						deltaCents: delta,
						totalRefunded,
					});
				}
			}
		} catch (error) {
			errored++;
			logger.error("Failed to reconcile overbilled order", error, {
				cronJob: "reconcile-refunds",
				orderId: order.id,
				orderNumber: order.orderNumber,
			});
		}
	}

	return { resolved, errored, tags: [...tags] };
}

/**
 * AM-1 — retente la création Stripe des auto-refunds bloqués.
 *
 * Cible : `Refund` APPROVED, `stripeRefundId IS NULL`, note préfixée
 * `AUTO_REFUND_NOTE_PREFIX` (donc émis automatiquement par un handler webhook),
 * dans la fenêtre [maxAge, minAge[ et sous le plafond de tentatives.
 *
 * Réutilise `initiateAutomaticRefund` (idempotent : retrouve le Refund local
 * existant et rappelle `stripe.refunds.create` avec la clé d'idempotence
 * `auto-refund-${paymentIntentId}` — Stripe renvoie le même `re_*` s'il avait
 * en fait été créé). En cas de succès, `stripeRefundId` est posé et la phase 1
 * du prochain run (ou le webhook `charge.refunded`) finalise le refund.
 *
 * `attemptCount` borne les retries : au plafond, on alerte l'admin (refund
 * manuel requis) et on cesse de retenter.
 */
async function retryStuckAutoRefundCreations(params: {
	minAge: Date;
	maxAge: Date;
	deadline: number;
}): Promise<{ retried: number; errored: number; skipped: number }> {
	const { minAge, maxAge, deadline } = params;

	const stuck = await prisma.refund.findMany({
		where: {
			status: RefundStatus.APPROVED,
			stripeRefundId: null,
			note: { startsWith: AUTO_REFUND_NOTE_PREFIX },
			attemptCount: { lt: AUTO_REFUND_MAX_CREATE_ATTEMPTS },
			createdAt: { gte: maxAge, lt: minAge },
			...notDeleted,
		},
		select: {
			id: true,
			orderId: true,
			attemptCount: true,
			order: {
				select: { stripePaymentIntentId: true, orderNumber: true },
			},
		},
		take: BATCH_SIZE_MEDIUM,
		orderBy: { createdAt: "asc" },
	});

	if (stuck.length === 0) {
		return { retried: 0, errored: 0, skipped: 0 };
	}

	logger.info("Found stuck auto-refunds without stripeRefundId", {
		cronJob: "reconcile-refunds",
		count: stuck.length,
	});

	let retried = 0;
	let errored = 0;
	let skipped = 0;

	for (const refund of stuck) {
		if (Date.now() > deadline) {
			logger.warn("Approaching timeout, stopping auto-refund retry phase early", {
				cronJob: "reconcile-refunds",
			});
			break;
		}

		const paymentIntentId = refund.order.stripePaymentIntentId;
		if (!paymentIntentId) {
			// Sans PI on ne peut pas appeler stripe.refunds.create — anomalie
			// (un auto-refund n'existe que sur une commande payée par PI).
			logger.error(
				`Stuck auto-refund ${refund.id} on order without stripePaymentIntentId — manual intervention`,
				undefined,
				{ cronJob: "reconcile-refunds", refundId: refund.id },
			);
			skipped++;
			continue;
		}

		// Incrémente AVANT l'appel pour borner même si l'appel throw/timeout.
		await prisma.refund.update({
			where: { id: refund.id },
			data: { attemptCount: { increment: 1 } },
		});
		const attemptsAfter = refund.attemptCount + 1;

		// Throttle uniforme (cap burst Stripe), comme la phase 1.
		await new Promise((resolve) => setTimeout(resolve, STRIPE_THROTTLE_MS));

		const result = await initiateAutomaticRefund(
			paymentIntentId,
			refund.orderId,
			"DLQ retry — création auto-refund échouée",
		);

		if (result.success) {
			retried++;
			logger.info(`Auto-refund creation succeeded on DLQ retry for refund ${refund.id}`, {
				cronJob: "reconcile-refunds",
				refundId: refund.id,
				attempt: attemptsAfter,
			});
			continue;
		}

		errored++;
		// Au plafond : on alerte l'admin (le client reste débité), on cesse de
		// retenter (la prochaine sélection exclut attemptCount >= plafond).
		if (attemptsAfter >= AUTO_REFUND_MAX_CREATE_ATTEMPTS) {
			await sendRefundFailureAlert(
				refund.orderId,
				paymentIntentId,
				"other",
				`Auto-refund Stripe création échouée après ${attemptsAfter} tentatives (DLQ reconcile-refunds). ${result.error?.message ?? ""}`,
			);
			Sentry.withScope((scope) => {
				scope.setLevel("error");
				scope.setTag("cron", "reconcile-refunds");
				scope.setTag("anomaly", "auto-refund-create-exhausted");
				scope.setFingerprint(["reconcile-refunds", "auto-refund-create-exhausted"]);
				scope.setContext("refund", {
					refundId: refund.id,
					orderNumber: refund.order.orderNumber,
					attempts: attemptsAfter,
				});
				Sentry.captureMessage(
					"Auto-refund creation exhausted retries (manual refund required)",
					"error",
				);
			});
		}
	}

	logger.info("Stuck auto-refund retry phase completed", {
		cronJob: "reconcile-refunds",
		retried,
		errored,
		skipped,
	});

	return { retried, errored, skipped };
}

interface FinalizeRefundResult {
	/** false si le refund n'était plus APPROVED (race webhook / admin). */
	finalized: boolean;
	/** true si cette finalisation rend la commande totalement remboursée. */
	isFullyRefunded: boolean;
	/** SKU dont l'inventory a réellement été incrémenté (restock=true + SKU vivant). */
	restockedSkuIds: string[];
}

const FINALIZE_NOOP: FinalizeRefundResult = {
	finalized: false,
	isFullyRefunded: false,
	restockedSkuIds: [],
};

/**
 * Finalise un refund APPROVED → COMPLETED dans une transaction atomique :
 * - update Refund (status, processedAt) avec guard TOCTOU
 * - restocke l'inventory des RefundItem `restock=true` (P2-1, parité
 *   process-refund Step 3) — le cron DLQ est le finaliseur réel des refunds
 *   admin dont le SAGA a échoué, donc sans ça l'inventory n'est jamais restauré
 * - recalcule le paymentStatus de l'order
 *
 * Retourne `finalized: false` si le refund n'était plus APPROVED (changement
 * d'état concurrent par webhook / action admin).
 */
async function finalizeRefund(params: {
	refundId: string;
	orderId: string;
	orderTotal: number;
	refundAmount: number;
}): Promise<FinalizeRefundResult> {
	const { refundId, orderId, orderTotal, refundAmount } = params;

	return prisma.$transaction(async (tx) => {
		const updated = await tx.refund.updateMany({
			where: { id: refundId, status: RefundStatus.APPROVED },
			data: { status: RefundStatus.COMPLETED, processedAt: new Date() },
		});
		if (updated.count === 0) {
			// Garde belt-and-suspenders : canTransition est déjà couvert par le
			// guard `status: APPROVED`, mais on logue le diagnostic.
			const current = await tx.refund.findUnique({
				where: { id: refundId },
				select: { status: true },
			});
			if (current && !canTransition(current.status, RefundStatus.COMPLETED)) {
				logger.warn("Refund cannot transition to COMPLETED — concurrent state change", {
					cronJob: "reconcile-refunds",
					refundId,
					currentStatus: current.status,
				});
			}
			return FINALIZE_NOOP;
		}

		// P2-1 : restock inventory pour les articles `restock=true`. Idempotent :
		// seul le chemin qui gagne le guard `status: APPROVED` ci-dessus exécute
		// ce bloc (process-refund Step 3 et ce cron sont mutuellement exclusifs).
		// Coalesce par skuId (parité process-refund). Un SKU supprimé entre la
		// création du refund et la réconciliation est skippé silencieusement.
		const refundItems = await tx.refundItem.findMany({
			where: { refundId, restock: true },
			select: { quantity: true, orderItem: { select: { skuId: true } } },
		});
		const restockBySkuId = new Map<string, number>();
		for (const ri of refundItems) {
			const skuId = ri.orderItem.skuId;
			if (skuId) {
				restockBySkuId.set(skuId, (restockBySkuId.get(skuId) ?? 0) + ri.quantity);
			}
		}
		const restockedSkuIds: string[] = [];
		if (restockBySkuId.size > 0) {
			// STOCK-LEDGER-001 : `UPDATE … RETURNING` remplace le couple
			// findMany-puis-update. Deux gains : le journal `StockMovement` obtient un
			// `previousInventory` lu AU MOMENT de l'écriture (le pré-SELECT laissait une
			// fenêtre READ COMMITTED où un writer concurrent rendait la valeur
			// consignée fausse), et le gate 0→N de la notif back-in-stock se calcule sur
			// la même vérité. Une requête de moins par SKU, aussi.
			// P1-1 : état AVANT crédit — discriminant de `shouldReactivateAfterRestock`.
			// On ne réactive que ce que la VENTE a désactivé (`inventory === 0`), jamais
			// un retrait manuel de l'admin. Sans ça, ce rattrapage recréditait le stock
			// en laissant le SKU invisible en vitrine, et la notif back-in-stock émise
			// juste en dessous pointait sur une PDP en 404.
			const skusBefore = await tx.productSku.findMany({
				where: { id: { in: [...restockBySkuId.keys()] } },
				select: { id: true, isActive: true, inventory: true },
			});
			const beforeById = new Map(skusBefore.map((s) => [s.id, s]));

			for (const [skuId, qty] of restockBySkuId) {
				const reactivate = shouldReactivateAfterRestock(beforeById.get(skuId));

				const updated = await tx.$queryRaw<Array<{ inventory: number; productId: string }>>`
					UPDATE "ProductSku"
					SET "inventory" = "inventory" + ${qty},
					    "isActive" = CASE WHEN ${reactivate} THEN true ELSE "isActive" END,
					    "updatedAt" = NOW()
					WHERE "id" = ${skuId}
					RETURNING "inventory", "productId"
				`;

				const row = updated[0];
				if (!row) continue; // SKU supprimé entre create et reconcile

				const previousInventory = row.inventory - qty;
				restockedSkuIds.push(skuId);
				await recordStockMovementTx(tx, {
					skuId,
					productId: row.productId,
					previousInventory,
					newInventory: row.inventory,
					source: StockMovementSource.SYSTEM,
					reason: `Réconciliation remboursement ${refundId}`,
				});
			}
		}

		// Recalcule total COMPLETED après cette finalisation
		const completedAggregate = await tx.refund.aggregate({
			where: { orderId, status: RefundStatus.COMPLETED },
			_sum: { amount: true },
		});
		const totalRefunded = completedAggregate._sum.amount ?? refundAmount;
		const isFullyRefunded = totalRefunded >= orderTotal;

		let newPaymentStatus: PaymentStatus | undefined;
		if (isFullyRefunded) {
			newPaymentStatus = PaymentStatus.REFUNDED;
		} else if (totalRefunded > 0) {
			newPaymentStatus = PaymentStatus.PARTIALLY_REFUNDED;
		}

		if (newPaymentStatus) {
			await tx.order.update({
				where: { id: orderId },
				data: { paymentStatus: newPaymentStatus },
			});
		}

		// Audit trail : conformité L123-22 + auditabilité du chemin DLQ. Sans
		// cette ligne, un refund finalisé via cron n'a aucune trace dans
		// OrderHistory contrairement aux refunds finalisés par webhook normal
		// ou action admin (drift invisible post-prod, impossible à expliquer
		// à un audit TVA).
		await createOrderAuditTx(tx, {
			orderId,
			action: OrderAction.REFUND_COMPLETED,
			source: HistorySource.SYSTEM,
			authorName: RECONCILE_AUDIT_AUTHOR,
			newPaymentStatus,
			note: "Refund completed via Stripe DLQ reconciliation",
			metadata: {
				refundId,
				refundAmount,
				totalRefunded,
				orderTotal,
				restockedSkuCount: restockedSkuIds.length,
				reason: "stripe_dlq_reconcile",
			},
		});

		return {
			finalized: true,
			isFullyRefunded,
			restockedSkuIds,
		};
	});
}
