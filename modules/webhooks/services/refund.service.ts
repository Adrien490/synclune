import type Stripe from "stripe";
import { logger } from "@/shared/lib/logger";
import {
	HistorySource,
	OrderAction,
	PaymentStatus,
	RefundReason,
	RefundStatus,
} from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { TX_TIMEOUT_LONG, TX_MAX_WAIT_LONG } from "@/shared/lib/prisma-tx-options";
import { sendAdminRefundFailedAlert } from "@/modules/emails/services/admin-emails";
import { getBaseUrl, ROUTES } from "@/shared/constants/urls";
import { DEFAULT_CURRENCY } from "@/shared/constants/currency";
import { canTransition } from "@/modules/refunds/services/refund-state-machine.service";
import { createOrderAuditTx } from "@/modules/orders/utils/order-audit";
import type { RefundRecord } from "../types/webhook.types";

export const WEBHOOK_AUDIT_AUTHOR = "Système (webhook Stripe)";

/**
 * ORD-STRIPE-006: Mappe Stripe refund.reason vers RefundReason local.
 * Utilisé pour les refunds créés via Dashboard Stripe (pas de metadata.refund_id)
 * afin de préserver la raison business plutôt que de tout marquer OTHER.
 */
function mapStripeRefundReason(stripeReason: string | null | undefined): RefundReason {
	switch (stripeReason) {
		case "requested_by_customer":
			return RefundReason.CUSTOMER_REQUEST;
		case "fraudulent":
			return RefundReason.FRAUD;
		case "duplicate":
		case "expired_uncaptured_charge":
		default:
			return RefundReason.OTHER;
	}
}

/**
 * `Refund.currency` a été droppée (audit schéma V1, 2026-08-05) : un seul marché,
 * une seule devise, et la colonne n'avait aucun lecteur. La devise reste néanmoins
 * une propriété qu'on veut voir diverger si elle diverge — un remboursement hérite
 * de la devise de sa charge, donc du PaymentIntent, déjà gardé côté commande
 * (`checkout-order-processing.service.ts`). Ce log est le témoin résiduel : il
 * n'échoue pas (le remboursement, lui, a bien eu lieu chez Stripe), il signale.
 */
function warnOnUnexpectedRefundCurrency(stripeRefund: Stripe.Refund): void {
	if ((stripeRefund.currency || DEFAULT_CURRENCY).toUpperCase() === DEFAULT_CURRENCY) return;
	logger.warn(`⚠️ [WEBHOOK] Refund ${stripeRefund.id} settled in ${stripeRefund.currency}`, {
		service: "webhook",
		stripeRefundId: stripeRefund.id,
		currency: stripeRefund.currency,
		expected: DEFAULT_CURRENCY,
	});
}

/** Dashboard refund créé pendant le sync (ORD-STRIPE-006 alert admin). */
export interface DashboardRefundSummary {
	stripeRefundId: string;
	amount: number;
	isFullRefund: boolean;
}

/**
 * Liste COMPLÈTE des remboursements d'une charge.
 *
 * `charge.refunds` est déclaré *nullable, expandable* par `api/charges/object`, et
 * la liste inline est **plafonnée à 10** — d'où le champ `refunds.has_more` que le
 * code ignorait. Au-delà de 10, `syncStripeRefunds` ne voyait qu'une partie des
 * lignes et n'en créait aucune pour le reste, pendant que `updateOrderPaymentStatus`
 * basculait quand même la commande depuis `charge.amount_refunded` : une commande
 * `REFUNDED` sans ligne `Refund`, donc **sans avoir** (Art. 272-I CGI).
 *
 * Improbable à ~20 commandes/mois — mais silencieux, et c'est ce qui le rend
 * coûteux : il ne se manifesterait qu'à la relecture comptable.
 *
 * Le repli est volontairement souple : si la pagination échoue, on garde la page
 * inline plutôt que de faire échouer tout le webhook (Stripe retenterait en
 * boucle sur une erreur qui n'est pas la sienne).
 */
async function resolveChargeRefunds(charge: Stripe.Charge): Promise<Stripe.Refund[]> {
	const inline = charge.refunds?.data ?? [];
	if (!charge.refunds?.has_more) return inline;

	try {
		const { stripe } = await import("@/shared/lib/stripe");
		const complete = await stripe.refunds
			.list({ charge: charge.id, limit: 100 })
			.autoPagingToArray({
				limit: 1000,
			});
		logger.info(`Charge ${charge.id} refunds paginated (${inline.length} → ${complete.length})`, {
			service: "webhook",
			chargeId: charge.id,
		});
		return complete;
	} catch (error) {
		logger.error("Failed to paginate charge refunds, falling back to inline page", error, {
			service: "webhook",
			chargeId: charge.id,
		});
		return inline;
	}
}

/**
 * Synchronise les remboursements Stripe avec la base de données
 * Gère les remboursements via l'app et via Dashboard Stripe
 *
 * Retourne la liste des refunds Dashboard nouvellement créés pour permettre
 * au handler webhook d'émettre une alerte admin temps réel (ORD-STRIPE-006).
 */
export async function syncStripeRefunds(
	charge: Stripe.Charge,
	existingRefunds: Array<{
		id: string;
		amount: number;
		status: RefundStatus;
		stripeRefundId: string | null;
		processedAt: Date | null;
	}>,
	orderId: string,
): Promise<{ dashboardRefundsCreated: DashboardRefundSummary[] }> {
	const stripeRefunds = await resolveChargeRefunds(charge);

	// ⚠️ AUDIT FIX: Batch toutes les opérations pour éviter N+1 queries
	// Collecter les opérations à effectuer
	type RefundOperation =
		| { type: "updateStatus"; id: string }
		| { type: "linkRefund"; id: string; stripeRefundId: string; status: RefundStatus }
		| {
				type: "upsertDashboard";
				stripeRefundId: string;
				amount: number;
				status: RefundStatus;
				reason: RefundReason;
		  };

	const operations: RefundOperation[] = [];
	// ORD-STRIPE-006 : trace les Dashboard refunds créés pour alerte admin
	const dashboardRefundsCreated: DashboardRefundSummary[] = [];

	// Index construit une fois : un `find` par refund Stripe était quadratique.
	const existingByStripeId = new Map(
		existingRefunds.filter((r) => r.stripeRefundId != null).map((r) => [r.stripeRefundId, r]),
	);

	for (const stripeRefund of stripeRefunds) {
		if (!stripeRefund.id) continue;

		const existingRefund = existingByStripeId.get(stripeRefund.id);

		if (existingRefund) {
			// ORD-STRIPE-002 : un refund APPROVED avec processedAt=null attend sa
			// finalisation COMPLÈTE (avoir Art. 272-I + email) par `refund.updated`
			// → `finalizeRefundCompletion` (P1-C, audit 2026-08-01), avec la tâche
			// Maintenance reconcile-refunds en filet. L'opération `updateStatus` de
			// ce chemin-ci est MAIGRE (status seul, sans avoir/email) : si elle
			// prenait COMPLETED ici, la finalisation verrait `status != APPROVED`
			// et abort → avoir et email perdus.
			//
			// ⚠️ Skip DÉLIBÉRÉMENT inconditionnel (pas de fenêtre 30 s comme
			// handleRefundUpdated) : un refund parti en `pending` chez Stripe garde
			// cette signature jusqu'à sa confirmation. Élargir ce chemin-ci
			// recréerait le trou.
			if (existingRefund.status === RefundStatus.APPROVED && existingRefund.processedAt === null) {
				logger.info(
					`Refund ${existingRefund.id} pending admin SAGA finalization — skipping webhook updateStatus`,
					{ service: "webhook", refundId: existingRefund.id, stripeRefundId: stripeRefund.id },
				);
				continue;
			}

			// Mettre à jour le statut si nécessaire (ORD-REFUND-012: utilise
			// mapStripeRefundStatus pour cohérence avec handleRefundUpdated)
			const newStatus = mapStripeRefundStatus(stripeRefund.status ?? undefined);
			if (
				existingRefund.status !== RefundStatus.COMPLETED &&
				newStatus === RefundStatus.COMPLETED
			) {
				operations.push({ type: "updateStatus", id: existingRefund.id });
			}
		} else {
			// Nouveau remboursement - peut venir de l'app ou du Dashboard Stripe
			const refundId = stripeRefund.metadata?.refund_id;
			const mappedStatus = mapStripeRefundStatus(stripeRefund.status ?? undefined);

			if (refundId) {
				// Remboursement créé via notre app - le lier
				operations.push({
					type: "linkRefund",
					id: refundId,
					stripeRefundId: stripeRefund.id,
					status: mappedStatus,
				});
			} else {
				// ORD-REFUND-004: avant de tomber dans le bucket "Dashboard", on
				// tente un fallback de matching par (orderId, amount, status
				// non-terminal, stripeRefundId NULL). Cas typique : un refund
				// admin a été créé via createRefund mais n'a pas encore été
				// processé (donc pas de stripeRefundId) et le webhook arrive
				// avant `processRefund` (out-of-order, ou client appelé Stripe
				// hors app). Sans matching par amount, deux Refund DB pour un
				// seul refund Stripe.
				const orphanCandidates = await prisma.refund.findMany({
					where: {
						orderId,
						amount: stripeRefund.amount,
						status: { in: [RefundStatus.PENDING, RefundStatus.APPROVED] },
						stripeRefundId: null,
					},
					select: { id: true },
				});

				if (orphanCandidates.length === 1) {
					const orphan = orphanCandidates[0];
					if (orphan) {
						operations.push({
							type: "linkRefund",
							id: orphan.id,
							stripeRefundId: stripeRefund.id,
							status: mappedStatus,
						});
						continue;
					}
				} else if (orphanCandidates.length > 1) {
					// Ambigu : plusieurs admin refunds même amount. Ne pas linker
					// au hasard — admin doit clarifier. Tombe sur upsertDashboard
					// pour traçabilité comptable + alerte plus bas.
					logger.warn(
						`⚠️ [WEBHOOK] Multiple admin refunds match Stripe refund ${stripeRefund.id} (amount: ${stripeRefund.amount}) — falling back to Dashboard upsert`,
						{ service: "webhook", orderId, candidates: orphanCandidates.length },
					);
				}

				// Remboursement fait depuis Stripe Dashboard - upsert pour idempotence
				warnOnUnexpectedRefundCurrency(stripeRefund);
				operations.push({
					type: "upsertDashboard",
					stripeRefundId: stripeRefund.id,
					amount: stripeRefund.amount || 0,
					status: mappedStatus,
					reason: mapStripeRefundReason(stripeRefund.reason),
				});
			}
		}
	}

	// Execute all operations atomically — partial sync would leave DB inconsistent with Stripe
	if (operations.length > 0) {
		const now = new Date();

		await prisma.$transaction(
			async (tx) => {
				for (const op of operations) {
					switch (op.type) {
						case "updateStatus": {
							// ORD-REFUND-005: guard sur status non-terminal pour éviter de
							// ressusciter un refund CANCELLED (état terminal) si Stripe
							// traite quand même le refund après une annulation dashboard.
							const refundForAudit = await tx.refund.findUnique({
								where: { id: op.id },
								select: { amount: true, stripeRefundId: true, status: true },
							});
							const updated = await tx.refund.updateMany({
								where: {
									id: op.id,
									status: { in: [RefundStatus.PENDING, RefundStatus.APPROVED] },
								},
								data: { status: RefundStatus.COMPLETED, processedAt: now },
							});
							if (updated.count === 0) {
								logger.error(
									`[WEBHOOK] Refund ${op.id} is terminal but Stripe marks succeeded — orphan refund`,
									undefined,
									{ service: "webhook", refundId: op.id },
								);
								break;
							}
							// ORD-REFUND-002: audit trail
							if (refundForAudit) {
								await createOrderAuditTx(tx, {
									orderId,
									action: OrderAction.REFUND_COMPLETED,
									source: HistorySource.WEBHOOK,
									authorName: WEBHOOK_AUDIT_AUTHOR,
									note: "Refund completed via charge.refunded webhook",
									metadata: {
										refundId: op.id,
										stripeRefundId: refundForAudit.stripeRefundId,
										amount: refundForAudit.amount,
										previousStatus: refundForAudit.status,
									},
								});
							}
							logger.info(`✅ [WEBHOOK] Refund ${op.id} marked as COMPLETED`, {
								service: "webhook",
							});
							break;
						}

						case "linkRefund": {
							// ORD-REFUND-005: guard sur status non-terminal — CANCELLED est
							// terminal (state machine), donc si le refund a été annulé côté
							// Stripe entre sa création et l'arrivée du webhook, on doit
							// signaler le refund Stripe orphelin.
							const refundForAudit = await tx.refund.findUnique({
								where: { id: op.id },
								select: { amount: true, status: true },
							});
							const updated = await tx.refund.updateMany({
								where: {
									id: op.id,
									status: {
										in: [RefundStatus.PENDING, RefundStatus.APPROVED, RefundStatus.FAILED],
									},
								},
								data: {
									stripeRefundId: op.stripeRefundId,
									status: op.status,
									processedAt: now,
								},
							});
							if (updated.count === 0) {
								logger.error(
									`[WEBHOOK] Refund ${op.id} is CANCELLED but Stripe processed refund ${op.stripeRefundId} — orphan refund, manual intervention required`,
									undefined,
									{
										service: "webhook",
										refundId: op.id,
										stripeRefundId: op.stripeRefundId,
									},
								);
								break;
							}
							// ORD-REFUND-002: audit trail (uniquement si transition vers COMPLETED)
							if (refundForAudit && op.status === RefundStatus.COMPLETED) {
								await createOrderAuditTx(tx, {
									orderId,
									action: OrderAction.REFUND_COMPLETED,
									source: HistorySource.WEBHOOK,
									authorName: WEBHOOK_AUDIT_AUTHOR,
									note: "Refund linked + completed via charge.refunded webhook",
									metadata: {
										refundId: op.id,
										stripeRefundId: op.stripeRefundId,
										amount: refundForAudit.amount,
										previousStatus: refundForAudit.status,
									},
								});
							}
							logger.info(
								`✅ [WEBHOOK] Linked existing refund ${op.id} to Stripe refund ${op.stripeRefundId}`,
								{ service: "webhook" },
							);
							break;
						}

						case "upsertDashboard": {
							// ORD-REFUND-003 / ORD-BIZ-001 : les refunds Dashboard arrivent sans
							// ventilation article par article — et n'en reçoivent plus. Le
							// modèle `RefundItem` a été retiré le 2026-08-05 : sa ventilation
							// était FABRIQUÉE (on rembourse un montant, pas des articles) et
							// produisait une ligne d'avoir qui ne s'additionnait pas (quantité
							// entière × prix plein ≠ montant proratisé). La traçabilité
							// comptable (Art. 272-I CGI) tient sur `Refund.amount` et l'avoir.
							// Le restock éventuel reste une décision admin (ajustement SKU).
							const existing = await tx.refund.findUnique({
								where: { stripeRefundId: op.stripeRefundId },
								select: { id: true },
							});

							if (existing) {
								await tx.refund.update({
									where: { stripeRefundId: op.stripeRefundId },
									data: { status: op.status, processedAt: now },
								});
								if (op.status === RefundStatus.COMPLETED) {
									await createOrderAuditTx(tx, {
										orderId,
										action: OrderAction.REFUND_COMPLETED,
										source: HistorySource.WEBHOOK,
										authorName: WEBHOOK_AUDIT_AUTHOR,
										note: "Dashboard refund finalized via webhook",
										metadata: {
											refundId: existing.id,
											stripeRefundId: op.stripeRefundId,
											amount: op.amount,
											source: "stripe_dashboard",
										},
									});
								}
								logger.info(`⚠️ [WEBHOOK] Updated Dashboard refund ${op.stripeRefundId}`, {
									service: "webhook",
								});
								break;
							}

							const orderForRefund = await tx.order.findUniqueOrThrow({
								where: { id: orderId },
								select: { total: true },
							});
							const isFullRefund = op.amount >= orderForRefund.total;

							const createdDashboardRefund = await tx.refund.create({
								data: {
									orderId,
									stripeRefundId: op.stripeRefundId,
									amount: op.amount,
									reason: op.reason,
									status: op.status,
									note: isFullRefund
										? "Remboursement TOTAL via Dashboard Stripe — stock non restauré (intervention admin requise si retour produit)"
										: "Remboursement PARTIEL via Dashboard Stripe — intervention admin requise pour restock",
									processedAt: now,
								},
								select: { id: true },
							});

							// ORD-REFUND-002: audit trail Dashboard refund creation
							await createOrderAuditTx(tx, {
								orderId,
								action:
									op.status === RefundStatus.COMPLETED
										? OrderAction.REFUND_COMPLETED
										: OrderAction.REFUND_CREATED,
								source: HistorySource.WEBHOOK,
								authorName: WEBHOOK_AUDIT_AUTHOR,
								note: isFullRefund
									? "Dashboard refund (full) — admin attention required for restock decision"
									: "Dashboard refund (partial) — admin attention required",
								metadata: {
									refundId: createdDashboardRefund.id,
									stripeRefundId: op.stripeRefundId,
									amount: op.amount,
									source: "stripe_dashboard",
									isFullRefund,
								},
							});

							logger.warn(
								`⚠️ [WEBHOOK] Created Dashboard refund ${op.stripeRefundId} (${isFullRefund ? "full" : "partial"}) — admin attention required`,
								{ service: "webhook", orderId, amount: op.amount, isFullRefund },
							);
							// ORD-STRIPE-006 : flag pour alerte admin temps réel
							dashboardRefundsCreated.push({
								stripeRefundId: op.stripeRefundId,
								amount: op.amount,
								isFullRefund,
							});
							break;
						}
					}
				}
			},
			// ORD-STRIPE-004 : tx batch upsert refunds — contention possible avec
			// SAGA admin processRefund concurrent. maxWait override évite P2024.
			{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
		);
	}

	return { dashboardRefundsCreated };
}

/**
 * Met à jour le statut de paiement d'une commande selon les remboursements.
 * Uses a transaction to re-read current status and prevent race conditions
 * when multiple charge.refunded events arrive concurrently.
 */
export async function updateOrderPaymentStatus(
	orderId: string,
	orderTotal: number,
	totalRefunded: number,
): Promise<{ isFullyRefunded: boolean; isPartiallyRefunded: boolean }> {
	const isFullyRefunded = totalRefunded >= orderTotal;
	const isPartiallyRefunded = totalRefunded > 0 && totalRefunded < orderTotal;

	await prisma.$transaction(
		async (tx) => {
			// Lock the order row to serialize concurrent refund webhook processing
			await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;

			const order = await tx.order.findUniqueOrThrow({
				where: { id: orderId },
				select: { paymentStatus: true },
			});

			if (isFullyRefunded && order.paymentStatus !== PaymentStatus.REFUNDED) {
				await tx.order.update({
					where: { id: orderId },
					data: { paymentStatus: PaymentStatus.REFUNDED },
				});
			} else if (
				isPartiallyRefunded &&
				order.paymentStatus !== PaymentStatus.PARTIALLY_REFUNDED &&
				order.paymentStatus !== PaymentStatus.REFUNDED
			) {
				await tx.order.update({
					where: { id: orderId },
					data: { paymentStatus: PaymentStatus.PARTIALLY_REFUNDED },
				});
			}
		},
		// IDEM-TX-001 : le `FOR UPDATE` ci-dessus peut attendre un webhook concurrent —
		// cette attente compte dans le timeout, les défauts 5s/2s sont trop serrés.
		{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
	);

	return { isFullyRefunded, isPartiallyRefunded };
}

/**
 * @public Exporté pour `test/contract/transactional-writes-schema-validity.contract.test.ts`,
 * qui le soumet au validateur Prisma réel : `updatedAt` avait survécu ici après le
 * drop de la colonne, invisible à `tsc`, et cassait toute résolution de refund.
 */
export const REFUND_RECORD_SELECT = {
	id: true,
	status: true,
	amount: true,
	reason: true,
	orderId: true,
	// ORD-REFUND-AUDIT-004 : processedAt + updatedAt requis pour le guard
	// SAGA in-flight dans handleRefundUpdated (skip webhook si refund admin
	// APPROVED + processedAt=null + updatedAt < 30s).
	processedAt: true,
	updatedAt: true,
	order: {
		select: {
			id: true,
			orderNumber: true,
			customerEmail: true,
			stripePaymentIntentId: true,
		},
	},
} as const;

/**
 * Resolves a refund by its Stripe ID or by metadata refund_id.
 * If found via metadataRefundId fallback, links the stripeRefundId atomically.
 */
export async function resolveRefundByStripeId(
	stripeRefundId: string,
	metadataRefundId?: string,
): Promise<RefundRecord | null> {
	// Direct lookup by stripeRefundId
	const refund = await prisma.refund.findUnique({
		where: { stripeRefundId },
		select: REFUND_RECORD_SELECT,
	});

	if (refund) return refund;

	// Fallback: find by metadata refund_id and link stripeRefundId atomically
	if (!metadataRefundId) return null;

	return prisma.$transaction(
		async (tx) => {
			const found = await tx.refund.findUnique({
				where: { id: metadataRefundId },
				select: REFUND_RECORD_SELECT,
			});

			if (found) {
				// IDEM-REFUNDSTATUS-001 : claim conditionnel — deux événements refund.*
				// concurrents (event.id distincts, dédup WebhookEvent inopérante) résolvaient
				// tous deux le même refund et réécrivaient le lien. Le `stripeRefundId: null`
				// borne l'écriture au 1ᵉʳ arrivé ; les suivants lisent la même valeur.
				await tx.refund.updateMany({
					where: { id: found.id, stripeRefundId: null },
					data: { stripeRefundId },
				});
			}

			return found;
		},
		// IDEM-TX-001 : aligné sur le reste du module.
		{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
	);
}

/**
 * Mappe le statut Stripe vers notre statut RefundStatus
 */
export function mapStripeRefundStatus(stripeStatus: string | undefined | null): RefundStatus {
	const statusMap: Record<string, RefundStatus> = {
		succeeded: RefundStatus.COMPLETED,
		pending: RefundStatus.APPROVED,
		failed: RefundStatus.FAILED,
		canceled: RefundStatus.CANCELLED,
		// `requires_action` était le SEUL statut de `api/refunds/object` sans entrée
		// ici : il retombait sur `PENDING`, que la machine à états refuse depuis
		// `APPROVED` — le remboursement restait donc APPROVED, et `reconcile-refunds`
		// le classait « ni succeeded ni failed » à chaque passage, sans jamais
		// escalader. Un remboursement pouvait rester en limbe indéfiniment sans que
		// personne ne l'apprenne. Il est en vol, pas en échec : `APPROVED`, comme
		// `pending`, ce qui le maintient candidat à la réconciliation.
		requires_action: RefundStatus.APPROVED,
	};

	return statusMap[stripeStatus ?? "pending"] ?? RefundStatus.PENDING;
}

/**
 * Met à jour le statut d'un remboursement avec historique
 * Validates state transitions to prevent invalid status changes
 *
 * ORD-REFUND-002: crée un OrderHistory pour chaque transition de statut webhook
 * (conformité L123-22 + auditabilité post-prod).
 */
export async function updateRefundStatus(
	refundId: string,
	newStatus: RefundStatus,
	stripeStatus: string,
	currentStatus?: RefundStatus,
): Promise<void> {
	// Fetch current status from DB if not provided to always validate transitions
	const refundForAudit = await prisma.refund.findUnique({
		where: { id: refundId },
		select: { status: true, orderId: true, amount: true, stripeRefundId: true },
	});
	const statusToValidate = currentStatus ?? refundForAudit?.status;

	if (statusToValidate && !canTransition(statusToValidate, newStatus)) {
		logger.warn(
			`⚠️ [WEBHOOK] Invalid refund status transition: ${statusToValidate} -> ${newStatus} for refund ${refundId}, skipping`,
			{ service: "webhook" },
		);
		return;
	}

	await prisma.$transaction(
		async (tx) => {
			// IDEM-REFUNDSTATUS-001 (audit idempotence 2026-07-26) : claim conditionnel sur
			// le statut LU. `refund.created`, `refund.updated` et `charge.refund.updated`
			// sont trois types d'événements routés vers le même handler (alias legacy) :
			// ce sont trois `event.id` DISTINCTS, que la dédup `WebhookEvent` ne couvre pas
			// par construction. Avec un `update` inconditionnel sur un statut lu hors tx,
			// deux d'entre eux en vol produisaient deux transitions → deux entrées
			// `OrderHistory` REFUND_COMPLETED dans une table IMMUABLE (Art. L123-22) et un
			// `processedAt` écrasé. Le perdant du claim ne journalise rien.
			const claimed = await tx.refund.updateMany({
				where: {
					id: refundId,
					// `statusToValidate` peut venir du caller (snapshot) ou de la relecture
					// ci-dessus ; dans les deux cas c'est l'état sur lequel `canTransition`
					// a statué, donc l'état qui doit encore être vrai à l'écriture.
					...(statusToValidate ? { status: statusToValidate } : {}),
				},
				data: {
					status: newStatus,
					processedAt: newStatus === RefundStatus.COMPLETED ? new Date() : undefined,
				},
			});

			if (claimed.count === 0) {
				logger.info(
					`⏭️ [WEBHOOK] Refund ${refundId} status already moved by a concurrent event, skipping`,
					{ service: "webhook", refundId, attemptedStatus: newStatus },
				);
				return;
			}

			if (refundForAudit && newStatus === RefundStatus.COMPLETED) {
				await createOrderAuditTx(tx, {
					orderId: refundForAudit.orderId,
					action: OrderAction.REFUND_COMPLETED,
					source: HistorySource.WEBHOOK,
					authorName: WEBHOOK_AUDIT_AUTHOR,
					note: `Refund completed via Stripe webhook (status: ${stripeStatus})`,
					metadata: {
						refundId,
						stripeRefundId: refundForAudit.stripeRefundId,
						amount: refundForAudit.amount,
						previousStatus: statusToValidate,
						stripeStatus,
					},
				});
			}
		},
		// IDEM-TX-001 : aligné sur le reste du module (défauts Prisma 5s/2s trop courts
		// sous contention multi-webhooks → P2024 + retry Stripe = plus de concurrence).
		{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
	);

	logger.info(`✅ [WEBHOOK] Refund ${refundId} status updated to ${newStatus}`, {
		service: "webhook",
	});
}

/**
 * Marque un remboursement comme échoué
 *
 * ORD-REFUND-002: crée un OrderHistory action=REFUND_FAILED source=WEBHOOK.
 */
export async function markRefundAsFailed(refundId: string, failureReason: string): Promise<void> {
	const refundForAudit = await prisma.refund.findUnique({
		where: { id: refundId },
		select: { orderId: true, amount: true, stripeRefundId: true, status: true },
	});

	await prisma.$transaction(
		async (tx) => {
			// IDEM-REFUNDSTATUS-001 : claim conditionnel — un `refund.failed` redélivré (ou
			// son alias) ne doit pas réécrire FAILED et empiler une 2ᵉ entrée d'audit
			// immuable. `status: { not: FAILED }` suffit : la cible est un état terminal
			// unique, donc le 1ᵉʳ passage rend le prédicat définitivement faux.
			const claimed = await tx.refund.updateMany({
				where: { id: refundId, status: { not: RefundStatus.FAILED } },
				data: {
					status: RefundStatus.FAILED,
					failureReason,
				},
			});

			if (claimed.count === 0) {
				logger.info(`⏭️ [WEBHOOK] Refund ${refundId} already FAILED, skipping audit`, {
					service: "webhook",
					refundId,
				});
				return;
			}

			if (refundForAudit) {
				await createOrderAuditTx(tx, {
					orderId: refundForAudit.orderId,
					action: OrderAction.REFUND_FAILED,
					source: HistorySource.WEBHOOK,
					authorName: WEBHOOK_AUDIT_AUTHOR,
					note: `Refund failed via Stripe webhook: ${failureReason}`,
					metadata: {
						refundId,
						stripeRefundId: refundForAudit.stripeRefundId,
						amount: refundForAudit.amount,
						previousStatus: refundForAudit.status,
						failureReason,
					},
				});
			}
		},
		// IDEM-TX-001 : aligné sur le reste du module.
		{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
	);

	logger.info(`✅ [WEBHOOK] Refund ${refundId} marked as FAILED (reason: ${failureReason})`, {
		service: "webhook",
	});
}

/**
 * Envoie une alerte admin pour un remboursement échoué
 */
export async function sendRefundFailedAlert(
	refund: RefundRecord,
	failureReason: string,
): Promise<void> {
	try {
		const baseUrl = getBaseUrl();
		const dashboardUrl = `${baseUrl}${ROUTES.ADMIN.REFUNDS}`;

		await sendAdminRefundFailedAlert({
			orderNumber: refund.order.orderNumber,
			customerEmail: refund.order.customerEmail ?? "Email non disponible",
			amount: refund.amount,
			reason: "other",
			errorMessage: `Échec remboursement Stripe: ${failureReason}`,
			stripePaymentIntentId: refund.order.stripePaymentIntentId ?? "",
			dashboardUrl,
		});

		logger.info(
			`🚨 [WEBHOOK] Admin alert sent for failed refund on order ${refund.order.orderNumber}`,
			{ service: "webhook" },
		);
	} catch (emailError) {
		logger.error("❌ [WEBHOOK] Error sending refund failure alert:", emailError, {
			service: "webhook",
		});
	}
}
