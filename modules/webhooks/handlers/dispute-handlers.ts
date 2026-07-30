import type Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/shared/lib/logger";
import {
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
import { getOrderInvalidationTags, ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { createOrderAuditTx } from "@/modules/orders/utils/order-audit";
import { voidInvoice } from "@/modules/orders/services/void-invoice.service";
import { issueCreditNoteForRefund } from "@/modules/refunds/services/issue-credit-note.service";
import {
	DISPUTE_CLOSED_NOTE_PREFIX,
	DISPUTE_OPENED_NOTE_PREFIX,
} from "@/modules/orders/services/has-open-dispute.service";
import type { WebhookHandlerResult, PostWebhookTask } from "../types/webhook.types";
import { SYSTEM_AUTHOR_ID } from "../constants/webhook.constants";
import { captureWebhookError } from "../utils/capture-webhook-error";

/**
 * Litiges Stripe — SANS miroir en base (simplification V1, 2026-07-30).
 *
 * Le modèle `Dispute` a été retiré : il n'avait aucune page admin, et un chargeback
 * se conteste dans le **Dashboard Stripe** (c'est là que se soumettent les preuves),
 * pas dans Synclune. Ce qui reste ici est ce qui a une conséquence LOCALE :
 *
 *  - `charge.dispute.created` → alerte admin (deadline de réponse) + audit trail.
 *  - `charge.dispute.closed`  → conséquences COMPTABLES d'un chargeback perdu :
 *    `Refund` COMPLETED, recalcul de `paymentStatus`, avoir Art. 272-I CGI.
 *
 * Trois events ont été retirés avec le modèle parce qu'ils ne faisaient que tenir le
 * miroir à jour : `charge.dispute.updated` (statut/fee), `funds_withdrawn` et
 * `funds_reinstated` (leur propre docstring disait « informatifs : pas de mutation
 * business directe » — la vraie transition vit dans `closed`). Stripe reste la source
 * de vérité du cycle de vie ; le lien profond vers son dashboard est dans l'alerte.
 *
 * ⚠️ L'anti-rejeu s'appuie sur `OrderHistory` (`note` préfixée), pas sur un `OrderNote` :
 * l'audit trail est immuable (Art. L123-22) et portait DÉJÀ le même texte en doublon.
 */

/** Libellés FR des raisons Stripe, pour l'alerte admin. */
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

const SYSTEM_AUTHOR_NAME = "Système (webhook Stripe)";

function resolvePaymentIntentId(dispute: Stripe.Dispute): string | undefined {
	return typeof dispute.payment_intent === "string"
		? dispute.payment_intent
		: dispute.payment_intent?.id;
}

/**
 * Handles charge.dispute.created — une cliente a ouvert un chargeback.
 *
 * 1. Retrouve la commande via le payment_intent du litige
 * 2. Écrit l'audit trail DISPUTE_OPENED (idempotent, sous verrou de ligne)
 * 3. Alerte l'admin avec la raison et la deadline de réponse Stripe
 */
export async function handleDisputeCreated(
	dispute: Stripe.Dispute,
): Promise<WebhookHandlerResult | null> {
	const paymentIntentId = resolvePaymentIntentId(dispute);

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

		const notePrefix = DISPUTE_OPENED_NOTE_PREFIX(dispute.id);

		// Fast path anti-rejeu : évite d'ouvrir une transaction sur une redélivrance
		// séquentielle. NON autoritatif (lecture hors verrou) — la garde qui décide
		// est rejouée sous `FOR UPDATE` dans la transaction (IDEM-DISPUTE-001).
		const existingAudit = await prisma.orderHistory.findFirst({
			where: {
				orderId: order.id,
				action: OrderAction.DISPUTE_OPENED,
				note: { startsWith: notePrefix },
			},
			select: { id: true },
		});

		if (existingAudit) {
			logger.info(`[WEBHOOK] Dispute ${dispute.id} already recorded, skipping creation`, {
				service: "webhook",
			});
			return { success: true, skipped: true, reason: "Dispute already recorded" };
		}

		const deadlineStr = dispute.evidence_details.due_by
			? new Date(dispute.evidence_details.due_by * 1000).toLocaleDateString("fr-FR")
			: "N/A";
		const noteContent = `${notePrefix}. Raison: ${DISPUTE_REASON_LABELS[dispute.reason] ?? dispute.reason}. Montant contesté: ${dispute.amount} centimes. Deadline de réponse: ${deadlineStr}.`;

		const dueBy = dispute.evidence_details.due_by
			? new Date(dispute.evidence_details.due_by * 1000)
			: null;

		const recorded = await prisma.$transaction(
			async (tx) => {
				// IDEM-DISPUTE-001 (audit idempotence 2026-07-26) : sérialise sur la ligne
				// Order les dispatches concurrents du MÊME event (fenêtre route/cron sur un
				// event FAILED, cf. IDEM-ROUTE-001), puis rejoue la garde SOUS le verrou.
				// Sans ça, deux exécutions parallèles passaient toutes deux le findFirst
				// hors-tx → 2 entrées d'audit + 2 alertes admin.
				await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE`;

				const concurrent = await tx.orderHistory.findFirst({
					where: {
						orderId: order.id,
						action: OrderAction.DISPUTE_OPENED,
						note: { startsWith: notePrefix },
					},
					select: { id: true },
				});

				if (concurrent) return false;

				// ORD-REFUND-002 + ORD-REFUND-009: audit trail dispute ouvert
				await createOrderAuditTx(tx, {
					orderId: order.id,
					action: OrderAction.DISPUTE_OPENED,
					source: HistorySource.WEBHOOK,
					authorId: SYSTEM_AUTHOR_ID,
					authorName: SYSTEM_AUTHOR_NAME,
					note: noteContent,
					metadata: {
						stripeDisputeId: dispute.id,
						amount: dispute.amount,
						fee: dispute.balance_transactions[0]?.fee ?? 0,
						reason: dispute.reason,
						dueBy: dueBy?.toISOString() ?? null,
						alreadyRefunded,
					},
				});

				return true;
			},
			// ORD-STRIPE-004 : maxWait override pour contention multi-webhooks.
			{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
		);

		// IDEM-DISPUTE-001 : claim perdu sous le verrou → un dispatch concurrent a déjà
		// tout écrit. Pas de 2ᵉ alerte admin (l'autre l'a émise).
		if (!recorded) {
			logger.info(
				`[WEBHOOK] Dispute ${dispute.id} already recorded by a concurrent dispatch, skipping`,
				{ service: "webhook" },
			);
			return { success: true, skipped: true, reason: "Dispute already recorded" };
		}

		logger.info(`⚠️ [WEBHOOK] Dispute ${dispute.id} created for order ${order.orderNumber}`, {
			service: "webhook",
		});

		const baseUrl = getBaseUrl();

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
						dashboardUrl: `${baseUrl}${ROUTES.ADMIN.ORDER_DETAIL(order.id)}`,
						stripeDashboardUrl: EXTERNAL_URLS.STRIPE.DISPUTE(dispute.id),
						// LOW-2 : dédup Resend 24h + DB (1 alerte d'ouverture par litige,
						// en plus de l'anti-replay audit ci-dessus — ceinture+bretelles).
						idempotencyKey: `alert:dispute-open:${dispute.id}`,
					},
				},
				{
					type: "INVALIDATE_CACHE",
					tags: [
						ORDERS_CACHE_TAGS.LIST,
						ORDERS_CACHE_TAGS.HISTORY(order.id),
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
 * Handles charge.dispute.closed — le litige est tranché.
 *
 * C'est le seul handler de litige à conséquence comptable : un chargeback PERDU
 * reprend des fonds sur une commande facturée, donc il se traite comme un
 * remboursement (Art. 272-I CGI), en miroir de `charge.refunded`.
 */
export async function handleDisputeClosed(
	dispute: Stripe.Dispute,
): Promise<WebhookHandlerResult | null> {
	const paymentIntentId = resolvePaymentIntentId(dispute);

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
				{
					service: "webhook",
				},
			);
			return { success: true, skipped: true, reason: "Order not found" };
		}

		const notePrefix = DISPUTE_CLOSED_NOTE_PREFIX(dispute.id);

		// Fast path anti-rejeu : évite d'ouvrir une transaction sur une redélivrance
		// séquentielle. NON autoritatif — la garde qui décide est rejouée sous
		// `FOR UPDATE` dans la transaction (IDEM-DISPUTE-001), car c'est ici que se
		// matérialisent le Refund chargeback et l'avoir.
		const existingAudit = await prisma.orderHistory.findFirst({
			where: {
				orderId: order.id,
				action: OrderAction.DISPUTE_RESOLVED,
				note: { startsWith: notePrefix },
			},
			select: { id: true },
		});

		if (existingAudit) {
			logger.info(`[WEBHOOK] Dispute ${dispute.id} closure already recorded, skipping`, {
				service: "webhook",
			});
			return { success: true, skipped: true, reason: "Dispute closure already recorded" };
		}

		// P1-A (audit dispute 2026-05-30) : SEUL `lost` reprend réellement des fonds.
		// Les autres statuts de clôture ne débitent rien et ne doivent déclencher
		// AUCUNE écriture comptable :
		//   - `won` : litige gagné, fonds conservés.
		//   - `warning_closed` : inquiry / retrieval request close sans escalade en
		//     chargeback (aucun débit Stripe).
		//   - `charge_refunded` : le charge a déjà été remboursé via `charge.refunded`
		//     (l'avoir a déjà été émis par ce chemin) → ne pas créer un second Refund
		//     fantôme.
		// L'ancien binaire `won = status === "won"` bookait tout ≠ won comme une
		// perte totale → remboursement fantôme + facture VOIDED.
		const isLoss = dispute.status === "lost";
		const statusLabel =
			dispute.status === "won"
				? "gagné"
				: dispute.status === "lost"
					? "perdu"
					: "clôturé sans débit";

		const noteContent = `${notePrefix} clôturé: ${statusLabel}.${isLoss ? " Le montant a été débité par Stripe." : ""}`;

		// P2-C : la fee de litige (~15 €) se matérialise dans les balance_transactions
		// au retrait des fonds. À la clôture, on la capte si présente (pour l'audit).
		const closedFee = dispute.balance_transactions[0]?.fee ?? 0;

		const outcome = await prisma.$transaction(
			async (tx) => {
				// IDEM-DISPUTE-001 (audit idempotence 2026-07-26) — P0. Cette transaction
				// matérialise un Refund COMPLETED (donc un avoir A-YYYY, scopé AU REFUND et
				// donc incapable de dédupliquer avec un second). Le seul garde-fou était un
				// findFirst sur préfixe de note, HORS transaction : deux dispatches concurrents
				// du même event (fenêtre route/cron, cf. IDEM-ROUTE-001) le passaient tous deux
				// → 2 avoirs pour une seule reprise de fonds Stripe. On sérialise sur la ligne
				// Order puis on rejoue la garde SOUS le verrou : un seul gagnant.
				await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE`;

				const concurrent = await tx.orderHistory.findFirst({
					where: {
						orderId: order.id,
						action: OrderAction.DISPUTE_RESOLVED,
						note: { startsWith: notePrefix },
					},
					select: { id: true },
				});

				if (concurrent) return { skipped: true as const };

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
				// mutation Order, juste audit trail. Aucun Refund/avoir (P1-A).
				await createOrderAuditTx(tx, {
					orderId: order.id,
					action: OrderAction.DISPUTE_RESOLVED,
					source: HistorySource.WEBHOOK,
					authorId: SYSTEM_AUTHOR_ID,
					authorName: SYSTEM_AUTHOR_NAME,
					note: noteContent,
					metadata: {
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
		// bookè la clôture. Ne PAS enchaîner l'avoir (ce serait le doublon).
		if (outcome.skipped) {
			logger.info(
				`[WEBHOOK] Dispute ${dispute.id} closure already booked by a concurrent dispatch, skipping`,
				{ service: "webhook" },
			);
			return { success: true, skipped: true, reason: "Dispute closure already recorded" };
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
		// l'ouverture (handleDisputeCreated) et l'issue est tracée en OrderHistory,
		// consultable sur le détail commande (réduction du volume d'alertes).
		// CACHE-AUDIT-010 : sur un chargeback perdu, `paymentStatus` passe
		// REFUNDED/PARTIALLY_REFUNDED (cf. lostOutcome) → passer par le helper
		// canonique pour couvrir le détail commande (DETAIL/CONFIRMATION/HISTORY)
		// ET l'espace client user-scopé (USER_ORDERS/LAST_ORDER).
		tasks.push({
			type: "INVALIDATE_CACHE",
			tags: getOrderInvalidationTags(order.userId ?? undefined, order.id),
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
