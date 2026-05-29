import type Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/shared/lib/logger";
import {
	DisputeReason,
	DisputeStatus,
	HistorySource,
	InvoiceStatus,
	OrderAction,
	PaymentStatus,
	RefundReason,
	RefundStatus,
} from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { TX_TIMEOUT_LONG, TX_MAX_WAIT_LONG } from "@/shared/lib/prisma-tx-options";
import { getBaseUrl, ROUTES, EXTERNAL_URLS } from "@/shared/constants/urls";
import { ORDERS_CACHE_TAGS, getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { createOrderAuditTx } from "@/modules/orders/utils/order-audit";
import { voidInvoice } from "@/modules/orders/services/void-invoice.service";
import { issueCreditNoteForRefund } from "@/modules/refunds/services/issue-credit-note.service";
import { recordRefundEReporting } from "@/modules/invoices/services/record-ereporting.service";
import type { WebhookHandlerResult, PostWebhookTask } from "../types/webhook.types";
import { SYSTEM_AUTHOR_ID } from "../constants/webhook.constants";
import { captureWebhookError } from "../utils/capture-webhook-error";

/**
 * Dispute reason labels for admin notification
 */
const DISPUTE_REASON_LABELS: Record<string, string> = {
	duplicate: "Paiement en double",
	fraudulent: "Fraude",
	subscription_canceled: "Abonnement annulé",
	product_unacceptable: "Produit non conforme",
	product_not_received: "Produit non reçu",
	unrecognized: "Transaction non reconnue",
	credit_not_processed: "Remboursement non effectué",
	general: "Litige général",
};

/**
 * Map Stripe dispute reasons to our DisputeReason enum
 */
const STRIPE_REASON_MAP: Record<string, DisputeReason> = {
	duplicate: DisputeReason.DUPLICATE,
	fraudulent: DisputeReason.FRAUDULENT,
	subscription_canceled: DisputeReason.SUBSCRIPTION_CANCELED,
	product_unacceptable: DisputeReason.PRODUCT_UNACCEPTABLE,
	product_not_received: DisputeReason.PRODUCT_NOT_RECEIVED,
	unrecognized: DisputeReason.UNRECOGNIZED,
	credit_not_processed: DisputeReason.CREDIT_NOT_PROCESSED,
	general: DisputeReason.GENERAL,
};

/**
 * Map Stripe dispute status to our DisputeStatus enum
 */
function mapStripeDisputeStatus(stripeStatus: string): DisputeStatus {
	switch (stripeStatus) {
		case "needs_response":
			return DisputeStatus.NEEDS_RESPONSE;
		case "under_review":
			return DisputeStatus.UNDER_REVIEW;
		case "won":
			return DisputeStatus.WON;
		case "lost":
			return DisputeStatus.LOST;
		case "charge_refunded":
			return DisputeStatus.CHARGE_REFUNDED;
		default:
			return DisputeStatus.NEEDS_RESPONSE;
	}
}

const SYSTEM_AUTHOR_NAME = "Système (webhook Stripe)";

/**
 * Handles charge.dispute.created — A customer opened a chargeback
 * 1. Find the order via the dispute's payment_intent
 * 2. Create an OrderNote with dispute details
 * 3. Send admin alert with dispute details and deadline
 */
export async function handleDisputeCreated(
	dispute: Stripe.Dispute,
): Promise<WebhookHandlerResult | null> {
	const paymentIntentId =
		typeof dispute.payment_intent === "string"
			? dispute.payment_intent
			: dispute.payment_intent?.id;

	try {
		if (!paymentIntentId) {
			logger.error("[WEBHOOK] Dispute without payment_intent:", undefined, {
				service: "webhook",
				disputeId: dispute.id,
			});
			throw new Error(`Dispute ${dispute.id} has no payment_intent`);
		}

		const order = await prisma.order.findFirst({
			where: { stripePaymentIntentId: paymentIntentId, ...notDeleted },
			select: {
				id: true,
				orderNumber: true,
				customerEmail: true,
				// ORD-REFUND-011: déclencher alerte spéciale si dispute sur order déjà remboursée
				paymentStatus: true,
			},
		});

		if (!order) {
			logger.error(`[WEBHOOK] No order found for disputed PI ${paymentIntentId}`, undefined, {
				service: "webhook",
			});
			throw new Error(`No order found for dispute ${dispute.id} (PI: ${paymentIntentId})`);
		}

		// ORD-REFUND-011: flag suspicious dispute (déjà remboursée → potentielle double dépense)
		const alreadyRefunded = order.paymentStatus === PaymentStatus.REFUNDED;

		// Prevent duplicate OrderNote on webhook replay
		const existingNote = await prisma.orderNote.findFirst({
			where: {
				orderId: order.id,
				content: { startsWith: `[LITIGE OUVERT] Litige Stripe ${dispute.id}` },
			},
			select: { id: true },
		});

		if (existingNote) {
			logger.info(`[WEBHOOK] Dispute note already exists for ${dispute.id}, skipping creation`, {
				service: "webhook",
			});
			return { success: true, skipped: true, reason: "Dispute note already created" };
		}

		// Create Dispute record and OrderNote atomically
		const deadlineStr = dispute.evidence_details.due_by
			? new Date(dispute.evidence_details.due_by * 1000).toLocaleDateString("fr-FR")
			: "N/A";
		const noteContent = `[LITIGE OUVERT] Litige Stripe ${dispute.id}. Raison: ${DISPUTE_REASON_LABELS[dispute.reason] ?? dispute.reason}. Montant contesté: ${dispute.amount} centimes. Deadline de réponse: ${deadlineStr}.`;

		const dueBy = dispute.evidence_details.due_by
			? new Date(dispute.evidence_details.due_by * 1000)
			: null;

		await prisma.$transaction(
			async (tx) => {
				const createdDispute = await tx.dispute.create({
					data: {
						stripeDisputeId: dispute.id,
						orderId: order.id,
						amount: dispute.amount,
						fee: dispute.balance_transactions[0]?.fee ?? 0,
						reason: STRIPE_REASON_MAP[dispute.reason] ?? DisputeReason.GENERAL,
						status: mapStripeDisputeStatus(dispute.status),
						dueBy,
					},
					select: { id: true },
				});

				await tx.orderNote.create({
					data: {
						orderId: order.id,
						content: noteContent,
						authorId: SYSTEM_AUTHOR_ID,
						authorName: SYSTEM_AUTHOR_NAME,
					},
				});

				// ORD-REFUND-002 + ORD-REFUND-009: audit trail dispute ouvert
				await createOrderAuditTx(tx, {
					orderId: order.id,
					action: OrderAction.DISPUTE_OPENED,
					source: HistorySource.WEBHOOK,
					authorId: SYSTEM_AUTHOR_ID,
					authorName: SYSTEM_AUTHOR_NAME,
					note: noteContent,
					metadata: {
						disputeId: createdDispute.id,
						stripeDisputeId: dispute.id,
						amount: dispute.amount,
						fee: dispute.balance_transactions[0]?.fee ?? 0,
						reason: dispute.reason,
						dueBy: dueBy?.toISOString() ?? null,
						alreadyRefunded,
					},
				});
			},
			// ORD-STRIPE-004 : maxWait override pour contention multi-webhooks.
			{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
		);

		logger.info(`⚠️ [WEBHOOK] Dispute ${dispute.id} created for order ${order.orderNumber}`, {
			service: "webhook",
		});

		const baseUrl = getBaseUrl();
		const dashboardUrl = `${baseUrl}${ROUTES.ADMIN.ORDER_DETAIL(order.id)}`;
		const stripeDashboardUrl = EXTERNAL_URLS.STRIPE.DISPUTE(dispute.id);

		return {
			success: true,
			tasks: [
				{
					type: "ADMIN_DISPUTE_ALERT",
					data: {
						orderNumber: order.orderNumber,
						customerEmail: order.customerEmail || "Email non disponible",
						amount: dispute.amount,
						// ORD-REFUND-011: signaler explicitement dans le sujet de l'alerte
						// si la commande était déjà remboursée (suspicion fraude/double dépense)
						reason: alreadyRefunded
							? `[CRITIQUE — commande déjà remboursée] ${DISPUTE_REASON_LABELS[dispute.reason] ?? dispute.reason}`
							: (DISPUTE_REASON_LABELS[dispute.reason] ?? dispute.reason),
						disputeId: dispute.id,
						deadline: dispute.evidence_details.due_by
							? new Date(dispute.evidence_details.due_by * 1000).toLocaleDateString("fr-FR")
							: null,
						dashboardUrl,
						stripeDashboardUrl,
						// LOW-2 : dédup Resend 24h + DB (1 alerte d'ouverture par litige,
						// en plus de l'anti-replay OrderNote ci-dessus — ceinture+bretelles).
						idempotencyKey: `alert:dispute-open:${dispute.id}`,
					},
				},
				{
					type: "INVALIDATE_CACHE",
					tags: [
						ORDERS_CACHE_TAGS.LIST,
						ORDERS_CACHE_TAGS.NOTES(order.id),
						SHARED_CACHE_TAGS.ADMIN_BADGES,
					],
				},
			],
		};
	} catch (error) {
		captureWebhookError(error, {
			handler: "handleDisputeCreated",
			eventType: "charge.dispute.created",
			stripeDisputeId: dispute.id,
			paymentIntentId,
		});
		throw error;
	}
}

/**
 * Handles charge.dispute.closed — A dispute was resolved (won or lost)
 * 1. Create an OrderNote with the outcome
 * 2. If lost: update paymentStatus to REFUNDED (Stripe already debited the amount)
 * 3. Send admin alert with the result
 */
export async function handleDisputeClosed(
	dispute: Stripe.Dispute,
): Promise<WebhookHandlerResult | null> {
	const paymentIntentId =
		typeof dispute.payment_intent === "string"
			? dispute.payment_intent
			: dispute.payment_intent?.id;

	try {
		if (!paymentIntentId) {
			logger.error("[WEBHOOK] Dispute closed without payment_intent:", undefined, {
				service: "webhook",
				disputeId: dispute.id,
			});
			throw new Error(`Dispute ${dispute.id} closed has no payment_intent`);
		}

		const order = await prisma.order.findFirst({
			where: { stripePaymentIntentId: paymentIntentId, ...notDeleted },
			select: {
				id: true,
				orderNumber: true,
				paymentStatus: true,
				total: true,
				// CACHE-AUDIT-010 : requis pour invalider les tags user-scopés
				// (USER_ORDERS/LAST_ORDER/ACCOUNT_STATS) quand un chargeback perdu
				// mute paymentStatus → REFUNDED/PARTIALLY_REFUNDED.
				userId: true,
			},
		});

		if (!order) {
			logger.error(`[WEBHOOK] No order found for closed dispute PI ${paymentIntentId}`, undefined, {
				service: "webhook",
			});
			throw new Error(`No order found for closed dispute ${dispute.id} (PI: ${paymentIntentId})`);
		}

		// Prevent duplicate OrderNote on webhook replay
		const existingNote = await prisma.orderNote.findFirst({
			where: {
				orderId: order.id,
				content: { startsWith: `[LITIGE CLOTURE] Litige ${dispute.id}` },
			},
			select: { id: true },
		});

		if (existingNote) {
			logger.info(`[WEBHOOK] Dispute closed note already exists for ${dispute.id}, skipping`, {
				service: "webhook",
			});
			return { success: true, skipped: true, reason: "Dispute closed note already created" };
		}

		const won = dispute.status === "won";
		const statusLabel = won ? "gagné" : "perdu";

		// Update Dispute record, create OrderNote, and update order status atomically
		const noteContent = `[LITIGE CLOTURE] Litige ${dispute.id} clôturé: ${statusLabel}.${!won ? " Le montant a été débité par Stripe." : ""}`;

		const lostOutcome = await prisma.$transaction(
			async (tx) => {
				// Update Dispute record if it exists
				const existingDispute = await tx.dispute.findUnique({
					where: { stripeDisputeId: dispute.id },
					select: { id: true },
				});

				if (existingDispute) {
					await tx.dispute.update({
						where: { stripeDisputeId: dispute.id },
						data: {
							status: mapStripeDisputeStatus(dispute.status),
							resolvedAt: new Date(),
						},
					});
				}

				await tx.orderNote.create({
					data: {
						orderId: order.id,
						content: noteContent,
						authorId: SYSTEM_AUTHOR_ID,
						authorName: SYSTEM_AUTHOR_NAME,
					},
				});

				// ORD-REFUND-010: matérialiser le chargeback perdu comme un Refund
				// COMPLETED reason=FRAUD pour traçabilité comptable. Recalculer
				// paymentStatus selon le cumul réel (un dispute perdu après refund
				// partiel doit refléter le bon total).
				if (!won) {
					const completedAggregate = await tx.refund.aggregate({
						where: { orderId: order.id, status: RefundStatus.COMPLETED },
						_sum: { amount: true },
					});
					const alreadyRefunded = completedAggregate._sum.amount ?? 0;

					const chargebackRefund = await tx.refund.create({
						data: {
							orderId: order.id,
							amount: dispute.amount,
							currency: "EUR",
							reason: RefundReason.FRAUD,
							status: RefundStatus.COMPLETED,
							note: `[CHARGEBACK PERDU] Litige Stripe ${dispute.id} — montant débité automatiquement par Stripe`,
							processedAt: new Date(),
						},
						select: { id: true },
					});

					const totalAfter = alreadyRefunded + dispute.amount;
					const isFullReclaim = totalAfter >= order.total;
					const computedStatus = isFullReclaim
						? PaymentStatus.REFUNDED
						: PaymentStatus.PARTIALLY_REFUNDED;

					// Ne pas rétrograder REFUNDED → PARTIALLY_REFUNDED (sticky state).
					const newPaymentStatus =
						order.paymentStatus === PaymentStatus.REFUNDED
							? PaymentStatus.REFUNDED
							: computedStatus;

					if (order.paymentStatus !== newPaymentStatus) {
						await tx.order.update({
							where: { id: order.id },
							data: { paymentStatus: newPaymentStatus },
						});
					}

					// ORD-REFUND-002: audit trail dispute resolved (perdu)
					await createOrderAuditTx(tx, {
						orderId: order.id,
						action: OrderAction.DISPUTE_RESOLVED,
						source: HistorySource.WEBHOOK,
						authorId: SYSTEM_AUTHOR_ID,
						authorName: SYSTEM_AUTHOR_NAME,
						previousPaymentStatus: order.paymentStatus,
						newPaymentStatus:
							order.paymentStatus !== newPaymentStatus ? newPaymentStatus : undefined,
						note: noteContent,
						metadata: {
							disputeId: existingDispute?.id ?? null,
							stripeDisputeId: dispute.id,
							won: false,
							amount: dispute.amount,
							fee: dispute.balance_transactions[0]?.fee ?? 0,
							chargebackRefundId: chargebackRefund.id,
							alreadyRefunded,
							totalAfter,
						},
					});

					return { chargebackRefundId: chargebackRefund.id, isFullReclaim, alreadyRefunded };
				}

				// Won: pas de mutation Order, juste audit trail
				await createOrderAuditTx(tx, {
					orderId: order.id,
					action: OrderAction.DISPUTE_RESOLVED,
					source: HistorySource.WEBHOOK,
					authorId: SYSTEM_AUTHOR_ID,
					authorName: SYSTEM_AUTHOR_NAME,
					note: noteContent,
					metadata: {
						disputeId: existingDispute?.id ?? null,
						stripeDisputeId: dispute.id,
						won: true,
						amount: dispute.amount,
						fee: dispute.balance_transactions[0]?.fee ?? 0,
					},
				});

				return null;
			},
			// ORD-STRIPE-004 : maxWait override pour contention multi-webhooks.
			{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
		);

		logger.info(
			`${won ? "✅" : "❌"} [WEBHOOK] Dispute ${dispute.id} closed (${statusLabel}) for order ${order.orderNumber}`,
			{ service: "webhook" },
		);

		const tasks: PostWebhookTask[] = [];

		// Chargeback PERDU : un chargeback reprend des fonds sur une commande
		// facturée → traiter comptablement comme un remboursement (Art. 272-I CGI),
		// en miroir du handler `charge.refunded`. Best-effort, hors transaction,
		// idempotent (mêmes services que le chemin refund).
		if (lostOutcome) {
			const { chargebackRefundId, isFullReclaim, alreadyRefunded } = lostOutcome;

			// (a) Avoir Art. 272-I : reprise TOTALE → voidInvoice (avoir canonique
			// sur Order.creditNoteNumber + facture VOIDED) ; reprise PARTIELLE →
			// avoir sur Refund.creditNoteNumber. Invariant CLAUDE.md #2 : le numéro
			// d'avoir n'est posé que par void-invoice.service / issue-credit-note.
			if (isFullReclaim) {
				const invoiceState = await prisma.order.findUnique({
					where: { id: order.id },
					select: { invoiceStatus: true, invoiceNumber: true },
				});
				if (invoiceState?.invoiceStatus === InvoiceStatus.GENERATED && invoiceState.invoiceNumber) {
					const voided = await voidInvoice({
						orderId: order.id,
						authorId: SYSTEM_AUTHOR_ID,
						authorName: SYSTEM_AUTHOR_NAME,
						source: HistorySource.WEBHOOK,
						reason: `Avoir émis suite à chargeback perdu (litige Stripe ${dispute.id})`,
					});
					if (voided.kind === "failed") {
						Sentry.withScope((scope) => {
							scope.setLevel("error");
							scope.setTag("invoicing", "void-invoice-failed");
							scope.setTag("source", "webhook-dispute-lost");
							scope.setFingerprint(["void-invoice", "max-retries", order.id]);
							scope.setContext("order", {
								orderId: order.id,
								orderNumber: order.orderNumber,
								stripeDisputeId: dispute.id,
							});
							Sentry.captureMessage(
								"voidInvoice failed on charge.dispute.closed (chargeback perdu) — facture stale",
								"error",
							);
						});
					}
				}
			} else {
				const creditNoteResult = await issueCreditNoteForRefund({
					refundId: chargebackRefundId,
					source: HistorySource.WEBHOOK,
					authorId: SYSTEM_AUTHOR_ID,
					authorName: SYSTEM_AUTHOR_NAME,
				});
				if (creditNoteResult.kind === "failed") {
					logger.warn(
						`charge.dispute.closed — credit note emission failed for refund ${chargebackRefundId}: ${creditNoteResult.error}`,
						{ service: "webhook", orderId: order.id, refundId: chargebackRefundId },
					);
				}
			}

			// (b) E-reporting REFUND DGFiP (EINV-AUDIT-004). Le chargebackRefund est
			// créé COMPLETED + processedAt → exclu du cron `reconcile-refunds`
			// (qui ne reprend que les APPROVED/processedAt=null). Sans ce hook, la
			// ligne négative DGFiP n'est jamais créée et l'agrégat B2C surévalue le
			// CA net. Best-effort + idempotent (unique index + findFirst).
			await recordRefundEReporting(chargebackRefundId);

			// MEDIUM-2 : double reprise de fonds (refund admin + chargeback) → le
			// cumul COMPLETED dépasse le total commande. Le booking est fidèle (les
			// fonds sont réellement partis 2×), mais c'est une perte/fraude probable
			// à instruire : alerte admin dédiée (dédup par dispute).
			if (alreadyRefunded + dispute.amount > order.total) {
				const baseUrl = getBaseUrl();
				tasks.push({
					type: "ADMIN_DISPUTE_ALERT",
					data: {
						orderNumber: order.orderNumber,
						customerEmail: "Voir commande",
						amount: dispute.amount,
						reason: `[DOUBLE REPRISE DE FONDS — suspicion fraude] Le cumul remboursé (${((alreadyRefunded + dispute.amount) / 100).toFixed(2)} €) dépasse le total commande (${(order.total / 100).toFixed(2)} €). Vérifier remboursement manuel + chargeback.`,
						disputeId: dispute.id,
						deadline: null,
						dashboardUrl: `${baseUrl}${ROUTES.ADMIN.ORDER_DETAIL(order.id)}`,
						stripeDashboardUrl: EXTERNAL_URLS.STRIPE.DISPUTE(dispute.id),
						idempotencyKey: `alert:dispute-double-reclaim:${dispute.id}`,
					},
				});
			}
		}

		// Pas de 2e mail d'issue (gagné/perdu) systématique : l'admin a été notifié à
		// l'ouverture (handleDisputeCreated) et l'issue est tracée en OrderNote +
		// OrderHistory, consultable sur le dashboard (réduction du volume d'alertes).
		// CACHE-AUDIT-010 : sur un chargeback perdu, `paymentStatus` passe
		// REFUNDED/PARTIALLY_REFUNDED (cf. lostOutcome) → passer par le helper
		// canonique pour couvrir le détail commande (DETAIL/CONFIRMATION/HISTORY)
		// ET l'espace client user-scopé (USER_ORDERS/LAST_ORDER/ACCOUNT_STATS).
		// Une liste manuelle laissait la commande affichée PAID côté client jusqu'à
		// l'expiration du profil `user` (~10 min). NOTES n'est pas couvert par le
		// helper (audit interne) → ajouté explicitement.
		tasks.push({
			type: "INVALIDATE_CACHE",
			tags: [
				...getOrderInvalidationTags(order.userId ?? undefined, order.id),
				ORDERS_CACHE_TAGS.NOTES(order.id),
			],
		});

		return { success: true, tasks };
	} catch (error) {
		captureWebhookError(error, {
			handler: "handleDisputeClosed",
			eventType: "charge.dispute.closed",
			stripeDisputeId: dispute.id,
			paymentIntentId,
		});
		throw error;
	}
}

/**
 * Handles charge.dispute.updated — Stripe émet cet event quand le litige évolue
 * en cours de vie (preuves soumises → `under_review`, mise à jour montant, etc.).
 *
 * Handler minimal : on rafraîchit `Dispute.status` + `dueBy` pour que le
 * dashboard reflète l'état réel (sans ça, un litige reste figé `NEEDS_RESPONSE`
 * jusqu'à la clôture même après soumission de preuves). Aucune mutation business
 * (pas de chargebackRefund, pas de paymentStatus) : ces transitions restent
 * exclusivement dans `charge.dispute.closed`. Idempotent (update par
 * stripeDisputeId, noop si le Dispute n'existe pas encore).
 */
export async function handleDisputeUpdated(
	dispute: Stripe.Dispute,
): Promise<WebhookHandlerResult | null> {
	try {
		const existing = await prisma.dispute.findUnique({
			where: { stripeDisputeId: dispute.id },
			select: { id: true, orderId: true, status: true },
		});

		if (!existing) {
			// L'event updated peut précéder created (ordre de livraison Stripe non
			// garanti) : on laisse created poser l'état initial.
			return { success: true, skipped: true, reason: "Dispute not yet created" };
		}

		const nextStatus = mapStripeDisputeStatus(dispute.status);
		const nextDueBy = dispute.evidence_details.due_by
			? new Date(dispute.evidence_details.due_by * 1000)
			: null;

		if (existing.status === nextStatus && nextDueBy === null) {
			return { success: true, skipped: true, reason: "No status change" };
		}

		await prisma.dispute.update({
			where: { stripeDisputeId: dispute.id },
			data: {
				status: nextStatus,
				...(nextDueBy ? { dueBy: nextDueBy } : {}),
			},
		});

		logger.info(`[WEBHOOK] Dispute ${dispute.id} updated → status ${nextStatus}`, {
			service: "webhook",
		});

		return {
			success: true,
			tasks: [
				{
					type: "INVALIDATE_CACHE",
					tags: [
						ORDERS_CACHE_TAGS.LIST,
						ORDERS_CACHE_TAGS.NOTES(existing.orderId),
						SHARED_CACHE_TAGS.ADMIN_BADGES,
					],
				},
			],
		};
	} catch (error) {
		captureWebhookError(error, {
			handler: "handleDisputeUpdated",
			eventType: "charge.dispute.updated",
			stripeDisputeId: dispute.id,
		});
		throw error;
	}
}

/**
 * ORD-REFUND-013 — Handlers minimalistes pour les flux de fonds liés aux disputes.
 *
 * `funds_withdrawn` : Stripe a retiré les fonds en attendant la résolution du dispute.
 * `funds_reinstated` : Stripe a restitué les fonds (cas dispute gagné après withdrawn).
 *
 * Ces events sont informatifs : pas de mutation business directe (les vraies
 * transitions paymentStatus restent dans `charge.dispute.closed`), mais on garde
 * un OrderNote + OrderHistory pour traçabilité de trésorerie.
 */
async function handleDisputeFundsFlow(
	dispute: Stripe.Dispute,
	flow: "withdrawn" | "reinstated",
): Promise<WebhookHandlerResult | null> {
	const paymentIntentId =
		typeof dispute.payment_intent === "string"
			? dispute.payment_intent
			: dispute.payment_intent?.id;
	const eventType = `charge.dispute.funds_${flow}` as const;
	const label = flow === "withdrawn" ? "Fonds retirés" : "Fonds restitués";
	const notePrefix = flow === "withdrawn" ? "[LITIGE FONDS RETIRÉS]" : "[LITIGE FONDS RESTITUÉS]";

	try {
		if (!paymentIntentId) {
			throw new Error(`Dispute ${dispute.id} ${flow} has no payment_intent`);
		}

		const order = await prisma.order.findFirst({
			where: { stripePaymentIntentId: paymentIntentId, ...notDeleted },
			select: { id: true, orderNumber: true },
		});

		if (!order) {
			logger.warn(`[WEBHOOK] No order found for dispute ${flow} PI ${paymentIntentId}`, {
				service: "webhook",
			});
			return { success: true, skipped: true, reason: `Order not found for dispute ${flow}` };
		}

		const noteContent = `${notePrefix} Litige ${dispute.id} — ${label} par Stripe (montant: ${dispute.amount} centimes).`;

		// Anti-replay
		const existingNote = await prisma.orderNote.findFirst({
			where: {
				orderId: order.id,
				content: { startsWith: `${notePrefix} Litige ${dispute.id}` },
			},
			select: { id: true },
		});

		if (existingNote) {
			return { success: true, skipped: true, reason: `Dispute ${flow} note already created` };
		}

		await prisma.$transaction(
			async (tx) => {
				await tx.orderNote.create({
					data: {
						orderId: order.id,
						content: noteContent,
						authorId: SYSTEM_AUTHOR_ID,
						authorName: SYSTEM_AUTHOR_NAME,
					},
				});
				await createOrderAuditTx(tx, {
					orderId: order.id,
					action: OrderAction.DISPUTE_RESOLVED,
					source: HistorySource.WEBHOOK,
					authorId: SYSTEM_AUTHOR_ID,
					authorName: SYSTEM_AUTHOR_NAME,
					note: noteContent,
					metadata: {
						stripeDisputeId: dispute.id,
						amount: dispute.amount,
						event: `funds_${flow}`,
					},
				});
			},
			// ORD-STRIPE-004 : maxWait override pour contention multi-webhooks.
			{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
		);

		logger.info(`💸 [WEBHOOK] Dispute ${dispute.id} funds ${flow} for order ${order.orderNumber}`, {
			service: "webhook",
		});

		return {
			success: true,
			tasks: [
				{
					type: "INVALIDATE_CACHE",
					tags: [
						ORDERS_CACHE_TAGS.LIST,
						ORDERS_CACHE_TAGS.NOTES(order.id),
						SHARED_CACHE_TAGS.ADMIN_BADGES,
					],
				},
			],
		};
	} catch (error) {
		captureWebhookError(error, {
			handler: `handleDisputeFunds${flow.charAt(0).toUpperCase()}${flow.slice(1)}`,
			eventType,
			stripeDisputeId: dispute.id,
			paymentIntentId,
		});
		throw error;
	}
}

export async function handleDisputeFundsWithdrawn(
	dispute: Stripe.Dispute,
): Promise<WebhookHandlerResult | null> {
	return handleDisputeFundsFlow(dispute, "withdrawn");
}

export async function handleDisputeFundsReinstated(
	dispute: Stripe.Dispute,
): Promise<WebhookHandlerResult | null> {
	return handleDisputeFundsFlow(dispute, "reinstated");
}
