import type Stripe from "stripe";
import { logger } from "@/shared/lib/logger";
import {
	HistorySource,
	OrderAction,
	PaymentStatus,
	RefundReason,
	RefundStatus,
} from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { sendAdminRefundFailedAlert } from "@/modules/emails/services/admin-emails";
import { getBaseUrl, ROUTES } from "@/shared/constants/urls";
import { canTransition } from "@/modules/refunds/services/refund-state-machine.service";
import { createOrderAuditTx } from "@/modules/orders/utils/order-audit";
import { SYSTEM_AUTHOR_ID } from "../constants/webhook.constants";
import type { RefundRecord } from "../types/webhook.types";

const WEBHOOK_AUDIT_AUTHOR = "Système (webhook Stripe)";

// Re-export types for backwards compatibility
/** Valid currency codes */
const VALID_CURRENCY_CODES = new Set(["EUR"]);

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
 * Validates and returns a currency code string, defaulting to EUR if invalid
 */
function validateCurrencyCode(currency: string | undefined | null): string {
	const normalized = currency?.toUpperCase() ?? "EUR";
	if (VALID_CURRENCY_CODES.has(normalized)) {
		return normalized;
	}
	logger.warn(`⚠️ [WEBHOOK] Unknown currency code: ${currency}, defaulting to EUR`, {
		service: "webhook",
	});
	return "EUR";
}

/**
 * Synchronise les remboursements Stripe avec la base de données
 * Gère les remboursements via l'app et via Dashboard Stripe
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
): Promise<void> {
	const stripeRefunds = charge.refunds?.data ?? [];

	// ⚠️ AUDIT FIX: Batch toutes les opérations pour éviter N+1 queries
	// Collecter les opérations à effectuer
	type RefundOperation =
		| { type: "updateStatus"; id: string }
		| { type: "linkRefund"; id: string; stripeRefundId: string; status: RefundStatus }
		| {
				type: "upsertDashboard";
				stripeRefundId: string;
				amount: number;
				currency: string;
				status: RefundStatus;
				reason: RefundReason;
		  };

	const operations: RefundOperation[] = [];

	for (const stripeRefund of stripeRefunds) {
		if (!stripeRefund.id) continue;

		const existingRefund = existingRefunds.find((r) => r.stripeRefundId === stripeRefund.id);

		if (existingRefund) {
			// ORD-STRIPE-002: si un SAGA processRefund est en cours (Step 2.5 a
			// posé stripeRefundId mais Step 3 n'a pas encore commit), on laisse
			// le SAGA finaliser pour que le restock + audit trail s'appliquent
			// dans la MÊME transaction. Si le webhook prenait COMPLETED ici,
			// Step 3 verrait `status != APPROVED` et abort → restock perdu et
			// le cron reconcile-refunds skip aussi (filtre status=APPROVED).
			// Signature SAGA en cours : status=APPROVED ET processedAt=null.
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
						...notDeleted,
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
				operations.push({
					type: "upsertDashboard",
					stripeRefundId: stripeRefund.id,
					amount: stripeRefund.amount || 0,
					currency: stripeRefund.currency || "EUR",
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
							// ORD-REFUND-005: guard sur status non-terminal + deletedAt
							// pour éviter de ressusciter un refund CANCELLED soft-deleted
							// si Stripe traite quand même le refund après cancel admin.
							const refundForAudit = await tx.refund.findUnique({
								where: { id: op.id },
								select: { amount: true, stripeRefundId: true, status: true },
							});
							const updated = await tx.refund.updateMany({
								where: {
									id: op.id,
									status: { in: [RefundStatus.PENDING, RefundStatus.APPROVED] },
									deletedAt: null,
								},
								data: { status: RefundStatus.COMPLETED, processedAt: now },
							});
							if (updated.count === 0) {
								logger.error(
									`[WEBHOOK] Refund ${op.id} is terminal/deleted but Stripe marks succeeded — orphan refund`,
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
									authorId: SYSTEM_AUTHOR_ID,
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
							// ORD-REFUND-005: guard sur status non-terminal + deletedAt
							// pour éviter de ressusciter un refund CANCELLED soft-deleted.
							// CANCELLED est terminal (state machine), donc si l'admin a
							// annulé entre Step 2 (Stripe call) et l'arrivée du webhook,
							// on doit signaler le refund Stripe orphelin.
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
									deletedAt: null,
								},
								data: {
									stripeRefundId: op.stripeRefundId,
									status: op.status,
									processedAt: now,
								},
							});
							if (updated.count === 0) {
								logger.error(
									`[WEBHOOK] Refund ${op.id} is CANCELLED/deleted but Stripe processed refund ${op.stripeRefundId} — orphan refund, manual intervention required`,
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
									authorId: SYSTEM_AUTHOR_ID,
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
							// ORD-REFUND-003: refunds Dashboard arrivent sans RefundItems
							// → impossible de connaître la breakdown article par article.
							// Si le montant correspond au total commande, on crée des
							// RefundItem couvrant tous les OrderItem (restock=false par
							// défaut : décision admin manuelle requise pour Dashboard).
							// Si partiel, on ne crée pas de RefundItem mais on alerte.
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
										authorId: SYSTEM_AUTHOR_ID,
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
								select: {
									total: true,
									items: { select: { id: true, price: true, quantity: true } },
								},
							});
							const isFullRefund = op.amount >= orderForRefund.total;

							const createdDashboardRefund = await tx.refund.create({
								data: {
									orderId,
									stripeRefundId: op.stripeRefundId,
									amount: op.amount,
									currency: validateCurrencyCode(op.currency),
									reason: op.reason,
									status: op.status,
									note: isFullRefund
										? "Remboursement TOTAL via Dashboard Stripe — stock non restauré (intervention admin requise si retour produit)"
										: "Remboursement PARTIEL via Dashboard Stripe — items non-traçables, intervention admin requise",
									processedAt: now,
									...(isFullRefund && orderForRefund.items.length > 0
										? {
												items: {
													create: orderForRefund.items.map((oi) => ({
														orderItemId: oi.id,
														quantity: oi.quantity,
														amount: oi.price * oi.quantity,
														restock: false,
													})),
												},
											}
										: {}),
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
								authorId: SYSTEM_AUTHOR_ID,
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
							break;
						}
					}
				}
			},
			{ timeout: 10000 },
		);
	}
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

	await prisma.$transaction(async (tx) => {
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
	});

	return { isFullyRefunded, isPartiallyRefunded };
}

const REFUND_RECORD_SELECT = {
	id: true,
	status: true,
	amount: true,
	reason: true,
	orderId: true,
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

	return prisma.$transaction(async (tx) => {
		const found = await tx.refund.findUnique({
			where: { id: metadataRefundId },
			select: REFUND_RECORD_SELECT,
		});

		if (found) {
			await tx.refund.update({
				where: { id: found.id },
				data: { stripeRefundId },
			});
		}

		return found;
	});
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

	await prisma.$transaction(async (tx) => {
		await tx.refund.update({
			where: { id: refundId },
			data: {
				status: newStatus,
				processedAt: newStatus === RefundStatus.COMPLETED ? new Date() : undefined,
			},
		});

		if (refundForAudit && newStatus === RefundStatus.COMPLETED) {
			await createOrderAuditTx(tx, {
				orderId: refundForAudit.orderId,
				action: OrderAction.REFUND_COMPLETED,
				source: HistorySource.WEBHOOK,
				authorId: SYSTEM_AUTHOR_ID,
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
	});

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

	await prisma.$transaction(async (tx) => {
		await tx.refund.update({
			where: { id: refundId },
			data: {
				status: RefundStatus.FAILED,
				failureReason,
			},
		});

		if (refundForAudit) {
			await createOrderAuditTx(tx, {
				orderId: refundForAudit.orderId,
				action: OrderAction.REFUND_FAILED,
				source: HistorySource.WEBHOOK,
				authorId: SYSTEM_AUTHOR_ID,
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
	});

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
