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
 * Map a Stripe dispute reason to our RefundReason enum (P2-F, audit dispute
 * 2026-05-30). Un chargeback perdu n'est PAS systématiquement une fraude :
 * `product_not_received` / `subscription_canceled` ne doivent pas être étiquetés
 * FRAUD (analytics + libellés email). FRAUD réservé aux raisons réellement
 * frauduleuses ; fallback OTHER sinon.
 */
function mapDisputeReasonToRefundReason(stripeReason: string): RefundReason {
	switch (stripeReason) {
		case "fraudulent":
		case "unrecognized":
			return RefundReason.FRAUD;
		case "product_not_received":
		case "product_unacceptable":
			return RefundReason.DEFECTIVE;
		default:
			return RefundReason.OTHER;
	}
}

/**
 * Map Stripe dispute status to our DisputeStatus enum.
 *
 * Les statuts d'inquiry/retrieval (`warning_*`) n'escaladent pas forcément en
 * chargeback : `warning_closed` = inquiry close SANS débit → mappé WON (terminal,
 * favorable marchand) pour ne pas laisser le litige "ouvert" côté guard. Cf. P1-A.
 */
function mapStripeDisputeStatus(stripeStatus: string): DisputeStatus {
	switch (stripeStatus) {
		case "needs_response":
		case "warning_needs_response":
			return DisputeStatus.NEEDS_RESPONSE;
		case "under_review":
		case "warning_under_review":
			return DisputeStatus.UNDER_REVIEW;
		case "won":
		case "warning_closed":
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
			// ORD-STRIPE-DISPUTE-001 : aucune commande locale (PI d'un autre système, ou
			// order hard-purgée). On skip proprement (200) au lieu de `throw` → évite une
			// tempête de retries Stripe + une fausse alerte « max retries exhausted ».
			// Aligné sur handleChargeRefunded (refund-handlers.ts) qui skip déjà ce cas.
			logger.warn(`⚠️ [WEBHOOK] No order found for disputed PI ${paymentIntentId}, skipping`, {
				service: "webhook",
			});
			return { success: true, skipped: true, reason: "Order not found" };
		}

		// ORD-REFUND-011: flag suspicious dispute (déjà remboursée → potentielle double dépense)
		const alreadyRefunded = order.paymentStatus === PaymentStatus.REFUNDED;

		// Fast path anti-rejeu : évite d'ouvrir une transaction sur une redélivrance
		// séquentielle. NON autoritatif (lecture hors verrou) — la garde qui décide
		// est rejouée sous `FOR UPDATE` dans la transaction (IDEM-DISPUTE-001).
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

		const created = await prisma.$transaction(
			async (tx) => {
				// IDEM-DISPUTE-001 (audit idempotence 2026-07-26) : sérialise sur la ligne
				// Order les dispatches concurrents du MÊME event (fenêtre route/cron sur un
				// event FAILED, cf. IDEM-ROUTE-001), puis rejoue la garde SOUS le verrou.
				// Sans ça, deux exécutions parallèles passaient toutes deux le findFirst
				// hors-tx → 2 OrderNote + P2002 non catché sur Dispute.stripeDisputeId.
				await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE`;

				const concurrentNote = await tx.orderNote.findFirst({
					where: {
						orderId: order.id,
						content: { startsWith: `[LITIGE OUVERT] Litige Stripe ${dispute.id}` },
					},
					select: { id: true },
				});

				if (concurrentNote) return null;

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

				return { disputeId: createdDispute.id };
			},
			// ORD-STRIPE-004 : maxWait override pour contention multi-webhooks.
			{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
		);

		// IDEM-DISPUTE-001 : claim perdu sous le verrou → un dispatch concurrent a déjà
		// tout écrit. Pas de 2ᵉ alerte admin (l'autre l'a émise).
		if (!created) {
			logger.info(
				`[WEBHOOK] Dispute ${dispute.id} already recorded by a concurrent dispatch, skipping`,
				{ service: "webhook" },
			);
			return { success: true, skipped: true, reason: "Dispute note already created" };
		}

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
				// (USER_ORDERS/LAST_ORDER) quand un chargeback perdu
				// mute paymentStatus → REFUNDED/PARTIALLY_REFUNDED.
				userId: true,
			},
		});

		if (!order) {
			// ORD-STRIPE-DISPUTE-001 : skip propre (200) au lieu de `throw` — cf.
			// handleDisputeCreated. Un litige clôturé sans commande locale ne doit pas
			// boucler en 500 ni déclencher l'alerte admin de retries épuisés.
			logger.warn(
				`⚠️ [WEBHOOK] No order found for closed dispute PI ${paymentIntentId}, skipping`,
				{ service: "webhook" },
			);
			return { success: true, skipped: true, reason: "Order not found" };
		}

		// Fast path anti-rejeu : évite d'ouvrir une transaction sur une redélivrance
		// séquentielle. NON autoritatif — la garde qui décide est rejouée sous
		// `FOR UPDATE` dans la transaction (IDEM-DISPUTE-001), car c'est ici que se
		// matérialisent le Refund chargeback, l'avoir et la ligne DGFiP.
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

		// P1-A (audit dispute 2026-05-30) : SEUL `lost` reprend réellement des fonds.
		// Les autres statuts de clôture ne débitent rien et ne doivent déclencher
		// AUCUNE écriture comptable :
		//   - `won` : litige gagné, fonds conservés.
		//   - `warning_closed` : inquiry / retrieval request close sans escalade en
		//     chargeback (aucun débit Stripe).
		//   - `charge_refunded` : le charge a déjà été remboursé via `charge.refunded`
		//     (l'avoir + l'e-reporting ont déjà été émis par ce chemin) → ne pas
		//     créer un second Refund fantôme.
		// L'ancien binaire `won = status === "won"` bookait tout ≠ won comme une
		// perte totale → remboursement fantôme + facture VOIDED + ligne DGFiP fausse.
		const isLoss = dispute.status === "lost";
		const statusLabel =
			dispute.status === "won"
				? "gagné"
				: dispute.status === "lost"
					? "perdu"
					: "clôturé sans débit";

		// Update Dispute record, create OrderNote, and update order status atomically
		const noteContent = `[LITIGE CLOTURE] Litige ${dispute.id} clôturé: ${statusLabel}.${isLoss ? " Le montant a été débité par Stripe." : ""}`;

		// P2-C : la fee de litige (~15 €) se matérialise dans les balance_transactions
		// au retrait des fonds, pas à la création. À la clôture, on la capte si
		// présente (sans écraser une valeur déjà posée par funds_withdrawn).
		const closedFee = dispute.balance_transactions[0]?.fee ?? 0;

		const outcome = await prisma.$transaction(
			async (tx) => {
				// IDEM-DISPUTE-001 (audit idempotence 2026-07-26) — P0. Cette transaction
				// matérialise un Refund COMPLETED (donc un avoir A-YYYY + une ligne DGFiP,
				// tous deux scopés AU REFUND et donc incapables de dédupliquer entre eux).
				// Le seul garde-fou était un findFirst sur préfixe de note, HORS transaction :
				// deux dispatches concurrents du même event (fenêtre route/cron, cf.
				// IDEM-ROUTE-001) le passaient tous deux → 2 avoirs + 2 déclarations pour une
				// seule reprise de fonds Stripe. On sérialise sur la ligne Order puis on
				// rejoue la garde SOUS le verrou : un seul gagnant, sans migration.
				await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE`;

				const concurrentNote = await tx.orderNote.findFirst({
					where: {
						orderId: order.id,
						content: { startsWith: `[LITIGE CLOTURE] Litige ${dispute.id}` },
					},
					select: { id: true },
				});

				if (concurrentNote) return { skipped: true as const };

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
							// P2-C : ne pas écraser une fee déjà captée (funds_withdrawn) par 0.
							...(closedFee > 0 ? { fee: closedFee } : {}),
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
				// COMPLETED pour traçabilité comptable. Recalculer paymentStatus selon
				// le cumul réel (un dispute perdu après refund partiel doit refléter le
				// bon total). N'EXÉCUTÉ QUE pour un litige réellement perdu (P1-A).
				if (isLoss) {
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
							// P2-F : refléter la vraie raison du litige (pas FRAUD systématique).
							reason: mapDisputeReasonToRefundReason(dispute.reason),
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
							fee: closedFee,
							chargebackRefundId: chargebackRefund.id,
							alreadyRefunded,
							totalAfter,
						},
					});

					return {
						skipped: false as const,
						lost: { chargebackRefundId: chargebackRefund.id, isFullReclaim, alreadyRefunded },
					};
				}

				// Clôture sans débit (won / warning_closed / charge_refunded) : pas de
				// mutation Order, juste audit trail. Aucun Refund/avoir/e-reporting (P1-A).
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
						won: dispute.status === "won",
						closedStatus: dispute.status,
						amount: dispute.amount,
						fee: closedFee,
					},
				});

				return { skipped: false as const, lost: null };
			},
			// ORD-STRIPE-004 : maxWait override pour contention multi-webhooks.
			{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
		);

		// IDEM-DISPUTE-001 : garde perdue sous le verrou → un dispatch concurrent a déjà
		// bookè la clôture. Ne PAS enchaîner avoir / e-reporting (ce serait le doublon).
		if (outcome.skipped) {
			logger.info(
				`[WEBHOOK] Dispute ${dispute.id} closure already booked by a concurrent dispatch, skipping`,
				{ service: "webhook" },
			);
			return { success: true, skipped: true, reason: "Dispute closed note already created" };
		}

		const lostOutcome = outcome.lost;

		logger.info(
			`${isLoss ? "❌" : "✅"} [WEBHOOK] Dispute ${dispute.id} closed (${statusLabel}) for order ${order.orderNumber}`,
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
					// P2-E : symétrie avec le chemin full-reclaim (voidInvoice) — un avoir
					// partiel Art. 272-I manquant est un gap réglementaire, pas un simple
					// warn. Alerter Sentry pour un signal opérateur.
					logger.warn(
						`charge.dispute.closed — credit note emission failed for refund ${chargebackRefundId}: ${creditNoteResult.error}`,
						{ service: "webhook", orderId: order.id, refundId: chargebackRefundId },
					);
					Sentry.withScope((scope) => {
						scope.setLevel("error");
						scope.setTag("invoicing", "credit-note-failed");
						scope.setTag("source", "webhook-dispute-lost");
						scope.setFingerprint(["credit-note", "max-retries", chargebackRefundId]);
						scope.setContext("order", {
							orderId: order.id,
							orderNumber: order.orderNumber,
							stripeDisputeId: dispute.id,
							refundId: chargebackRefundId,
						});
						Sentry.captureMessage(
							"issueCreditNoteForRefund failed on charge.dispute.closed (chargeback perdu partiel) — avoir manquant",
							"error",
						);
					});
				}
			}

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
		// ET l'espace client user-scopé (USER_ORDERS/LAST_ORDER).
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
			select: { id: true, orderId: true, status: true, dueBy: true },
		});

		if (!existing) {
			// L'event updated peut précéder created (ordre de livraison Stripe non
			// garanti) : on laisse created poser l'état initial.
			return { success: true, skipped: true, reason: "Dispute not yet created" };
		}

		const nextStatus = mapStripeDisputeStatus(dispute.status);

		// P2-D (audit dispute 2026-05-30) : les transitions TERMINALES (WON/LOST/
		// CHARGE_REFUNDED) sont la propriété exclusive de `charge.dispute.closed`
		// (compta : chargebackRefund, paymentStatus, avoir, e-reporting). Si Stripe
		// livre un statut terminal via `updated` (ordre de livraison non garanti),
		// on NE mute PAS le Dispute ici — sinon `hasOpenDispute` le verrait terminal
		// et débloquerait refund/cancel/fulfillment AVANT que la compta de clôture
		// ait tourné. `closed` posera l'état terminal + `resolvedAt`.
		const TERMINAL_STATUSES: DisputeStatus[] = [
			DisputeStatus.WON,
			DisputeStatus.LOST,
			DisputeStatus.CHARGE_REFUNDED,
		];
		if (TERMINAL_STATUSES.includes(nextStatus)) {
			return {
				success: true,
				skipped: true,
				reason: "Terminal status owned by charge.dispute.closed",
			};
		}

		const nextDueBy = dispute.evidence_details.due_by
			? new Date(dispute.evidence_details.due_by * 1000)
			: null;

		// P2-G : comparer ET écrire `dueBy` inconditionnellement (y compris `null`)
		// pour refléter une deadline effacée/prolongée par Stripe.
		const dueByChanged = (existing.dueBy?.getTime() ?? null) !== (nextDueBy?.getTime() ?? null);

		if (existing.status === nextStatus && !dueByChanged) {
			return { success: true, skipped: true, reason: "No status change" };
		}

		await prisma.dispute.update({
			where: { stripeDisputeId: dispute.id },
			data: {
				status: nextStatus,
				dueBy: nextDueBy,
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

		// P2-C : la fee de litige (~15 €) se matérialise dans les balance_transactions
		// au RETRAIT des fonds (`funds_withdrawn`), pas à la création (où le tableau
		// est vide → l'ancien code laissait `Dispute.fee` à 0 à vie). On la capte ici.
		const withdrawnFee = flow === "withdrawn" ? (dispute.balance_transactions[0]?.fee ?? 0) : 0;

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
				// P2-C : updateMany (no-op si le Dispute n'est pas encore créé — l'event
				// funds_withdrawn peut précéder created). N'écrase pas une fee déjà posée.
				if (withdrawnFee > 0) {
					await tx.dispute.updateMany({
						where: { stripeDisputeId: dispute.id, fee: 0 },
						data: { fee: withdrawnFee },
					});
				}
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
