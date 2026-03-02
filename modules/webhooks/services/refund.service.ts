import type Stripe from "stripe";
import { logger } from "@/shared/lib/logger";
import { PaymentStatus, RefundStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { sendAdminRefundFailedAlert } from "@/modules/emails/services/admin-emails";
import { getBaseUrl, ROUTES } from "@/shared/constants/urls";
import type { RefundSyncResult, RefundRecord } from "../types/webhook.types";

// Re-export types for backwards compatibility
export type { RefundSyncResult, RefundRecord };

/** Valid currency codes */
const VALID_CURRENCY_CODES = new Set(["EUR"]);

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
		  };

	const operations: RefundOperation[] = [];

	for (const stripeRefund of stripeRefunds) {
		if (!stripeRefund.id) continue;

		const existingRefund = existingRefunds.find((r) => r.stripeRefundId === stripeRefund.id);

		if (existingRefund) {
			// Mettre à jour le statut si nécessaire
			if (existingRefund.status !== RefundStatus.COMPLETED && stripeRefund.status === "succeeded") {
				operations.push({ type: "updateStatus", id: existingRefund.id });
			}
		} else {
			// Nouveau remboursement - peut venir de l'app ou du Dashboard Stripe
			const refundId = stripeRefund.metadata?.refund_id;

			if (refundId) {
				// Remboursement créé via notre app - le lier
				operations.push({
					type: "linkRefund",
					id: refundId,
					stripeRefundId: stripeRefund.id,
					status:
						stripeRefund.status === "succeeded" ? RefundStatus.COMPLETED : RefundStatus.PENDING,
				});
			} else {
				// Remboursement fait depuis Stripe Dashboard - upsert pour idempotence
				operations.push({
					type: "upsertDashboard",
					stripeRefundId: stripeRefund.id,
					amount: stripeRefund.amount || 0,
					currency: stripeRefund.currency || "EUR",
					status:
						stripeRefund.status === "succeeded" ? RefundStatus.COMPLETED : RefundStatus.PENDING,
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
						case "updateStatus":
							await tx.refund.update({
								where: { id: op.id },
								data: { status: RefundStatus.COMPLETED },
							});
							logger.info(`✅ [WEBHOOK] Refund ${op.id} marked as COMPLETED`, {
								service: "webhook",
							});
							break;

						case "linkRefund":
							await tx.refund.update({
								where: { id: op.id },
								data: {
									stripeRefundId: op.stripeRefundId,
									status: op.status,
									processedAt: now,
								},
							});
							logger.info(
								`✅ [WEBHOOK] Linked existing refund ${op.id} to Stripe refund ${op.stripeRefundId}`,
								{ service: "webhook" },
							);
							break;

						case "upsertDashboard":
							await tx.refund.upsert({
								where: { stripeRefundId: op.stripeRefundId },
								create: {
									orderId,
									stripeRefundId: op.stripeRefundId,
									amount: op.amount,
									currency: validateCurrencyCode(op.currency),
									reason: "OTHER",
									status: op.status,
									note: "Remboursement effectué via Dashboard Stripe",
									processedAt: now,
								},
								update: {
									status: op.status,
									processedAt: now,
								},
							});
							logger.info(
								`⚠️ [WEBHOOK] Upserted refund record for Stripe Dashboard refund ${op.stripeRefundId}`,
								{ service: "webhook" },
							);
							break;
					}
				}
			},
			{ timeout: 10000 },
		);
	}
}

/**
 * Met à jour le statut de paiement d'une commande selon les remboursements
 */
export async function updateOrderPaymentStatus(
	orderId: string,
	orderTotal: number,
	totalRefunded: number,
	currentPaymentStatus: PaymentStatus,
): Promise<{ isFullyRefunded: boolean; isPartiallyRefunded: boolean }> {
	const isFullyRefunded = totalRefunded >= orderTotal;
	const isPartiallyRefunded = totalRefunded > 0 && totalRefunded < orderTotal;

	if (isFullyRefunded && currentPaymentStatus !== PaymentStatus.REFUNDED) {
		await prisma.order.update({
			where: { id: orderId },
			data: { paymentStatus: PaymentStatus.REFUNDED },
		});
	} else if (
		isPartiallyRefunded &&
		currentPaymentStatus !== PaymentStatus.PARTIALLY_REFUNDED &&
		currentPaymentStatus !== PaymentStatus.REFUNDED
	) {
		await prisma.order.update({
			where: { id: orderId },
			data: { paymentStatus: PaymentStatus.PARTIALLY_REFUNDED },
		});
	}

	return { isFullyRefunded, isPartiallyRefunded };
}

/**
 * Resolves a refund by its Stripe ID or by metadata refund_id.
 * If found via metadataRefundId fallback, links the stripeRefundId to the record.
 */
export async function resolveRefundByStripeId(
	stripeRefundId: string,
	metadataRefundId?: string,
): Promise<RefundRecord | null> {
	// D'abord chercher via stripeRefundId
	let refund = await prisma.refund.findUnique({
		where: { stripeRefundId },
		select: {
			id: true,
			status: true,
			amount: true,
			orderId: true,
			order: {
				select: {
					id: true,
					orderNumber: true,
					customerEmail: true,
					stripePaymentIntentId: true,
				},
			},
		},
	});

	// Si pas trouvé et metadata présente, chercher via refund_id
	if (!refund && metadataRefundId) {
		refund = await prisma.refund.findUnique({
			where: { id: metadataRefundId },
			select: {
				id: true,
				status: true,
				amount: true,
				orderId: true,
				order: {
					select: {
						id: true,
						orderNumber: true,
						customerEmail: true,
						stripePaymentIntentId: true,
					},
				},
			},
		});

		// Lier le stripeRefundId si trouvé
		if (refund) {
			await prisma.refund.update({
				where: { id: refund.id },
				data: { stripeRefundId },
			});
		}
	}

	return refund;
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

/** Valid state transitions for refund status */
const VALID_REFUND_TRANSITIONS: Record<RefundStatus, RefundStatus[]> = {
	[RefundStatus.PENDING]: [
		RefundStatus.APPROVED,
		RefundStatus.COMPLETED,
		RefundStatus.REJECTED,
		RefundStatus.FAILED,
		RefundStatus.CANCELLED,
	],
	[RefundStatus.APPROVED]: [RefundStatus.COMPLETED, RefundStatus.FAILED, RefundStatus.CANCELLED],
	[RefundStatus.COMPLETED]: [],
	[RefundStatus.REJECTED]: [],
	[RefundStatus.FAILED]: [RefundStatus.APPROVED, RefundStatus.COMPLETED],
	[RefundStatus.CANCELLED]: [],
};

/**
 * Met à jour le statut d'un remboursement avec historique
 * Validates state transitions to prevent invalid status changes
 */
export async function updateRefundStatus(
	refundId: string,
	newStatus: RefundStatus,
	stripeStatus: string,
	currentStatus?: RefundStatus,
): Promise<void> {
	// Fetch current status from DB if not provided to always validate transitions
	const statusToValidate =
		currentStatus ??
		(
			await prisma.refund.findUnique({
				where: { id: refundId },
				select: { status: true },
			})
		)?.status;

	if (statusToValidate) {
		const validTransitions = VALID_REFUND_TRANSITIONS[statusToValidate];
		if (!validTransitions.includes(newStatus)) {
			logger.warn(
				`⚠️ [WEBHOOK] Invalid refund status transition: ${statusToValidate} -> ${newStatus} for refund ${refundId}, skipping`,
				{ service: "webhook" },
			);
			return;
		}
	}

	await prisma.refund.update({
		where: { id: refundId },
		data: {
			status: newStatus,
			processedAt: newStatus === RefundStatus.COMPLETED ? new Date() : undefined,
		},
	});

	logger.info(`✅ [WEBHOOK] Refund ${refundId} status updated to ${newStatus}`, {
		service: "webhook",
	});
}

/**
 * Marque un remboursement comme échoué
 */
export async function markRefundAsFailed(refundId: string, failureReason: string): Promise<void> {
	await prisma.refund.update({
		where: { id: refundId },
		data: {
			status: RefundStatus.FAILED,
			failureReason,
		},
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
