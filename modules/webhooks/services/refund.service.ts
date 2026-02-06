import Stripe from "stripe";
import { PaymentStatus, RefundStatus, RefundAction, CurrencyCode } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { sendRefundConfirmationEmail } from "@/modules/emails/services/refund-emails";
import { sendAdminRefundFailedAlert } from "@/modules/emails/services/admin-emails";
import { getBaseUrl, ROUTES } from "@/shared/constants/urls";
import type { RefundSyncResult, RefundRecord } from "../types/webhook.types";

// Re-export types for backwards compatibility
export type { RefundSyncResult, RefundRecord };

/** Valeurs valides de CurrencyCode */
const VALID_CURRENCY_CODES: Set<string> = new Set(Object.values(CurrencyCode));

/**
 * Valide et retourne un CurrencyCode, avec fallback sur EUR si invalide
 */
function validateCurrencyCode(currency: string | undefined | null): CurrencyCode {
	const normalized = currency?.toUpperCase() || "EUR";
	if (VALID_CURRENCY_CODES.has(normalized)) {
		return normalized as CurrencyCode;
	}
	console.warn(`⚠️ [WEBHOOK] Unknown currency code: ${currency}, defaulting to EUR`);
	return CurrencyCode.EUR;
}

/**
 * Synchronise les remboursements Stripe avec la base de données
 * Gère les remboursements via l'app et via Dashboard Stripe
 */
export async function syncStripeRefunds(
	charge: Stripe.Charge,
	existingRefunds: Array<{ id: string; amount: number; status: RefundStatus; stripeRefundId: string | null }>,
	orderId: string
): Promise<void> {
	const stripeRefunds = charge.refunds?.data || [];

	// ⚠️ AUDIT FIX: Batch toutes les opérations pour éviter N+1 queries
	// Collecter les opérations à effectuer
	type RefundOperation =
		| { type: "updateStatus"; id: string }
		| { type: "linkRefund"; id: string; stripeRefundId: string; status: RefundStatus }
		| { type: "upsertDashboard"; stripeRefundId: string; amount: number; currency: string; status: RefundStatus };

	const operations: RefundOperation[] = [];

	for (const stripeRefund of stripeRefunds) {
		if (!stripeRefund.id) continue;

		const existingRefund = existingRefunds.find(
			(r) => r.stripeRefundId === stripeRefund.id
		);

		if (existingRefund) {
			// Mettre à jour le statut si nécessaire
			if (
				existingRefund.status !== RefundStatus.COMPLETED &&
				stripeRefund.status === "succeeded"
			) {
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
					status: stripeRefund.status === "succeeded"
						? RefundStatus.COMPLETED
						: RefundStatus.PENDING,
				});
			} else {
				// Remboursement fait depuis Stripe Dashboard - upsert pour idempotence
				operations.push({
					type: "upsertDashboard",
					stripeRefundId: stripeRefund.id,
					amount: stripeRefund.amount || 0,
					currency: stripeRefund.currency || "EUR",
					status: stripeRefund.status === "succeeded"
						? RefundStatus.COMPLETED
						: RefundStatus.PENDING,
				});
			}
		}
	}

	// Exécuter toutes les opérations en parallèle
	if (operations.length > 0) {
		const now = new Date();

		await Promise.all(
			operations.map((op) => {
				switch (op.type) {
					case "updateStatus":
						console.log(`✅ [WEBHOOK] Refund ${op.id} marked as COMPLETED`);
						return prisma.refund.update({
							where: { id: op.id },
							data: { status: RefundStatus.COMPLETED },
						});

					case "linkRefund":
						console.log(`✅ [WEBHOOK] Linked existing refund ${op.id} to Stripe refund ${op.stripeRefundId}`);
						return prisma.refund.update({
							where: { id: op.id },
							data: {
								stripeRefundId: op.stripeRefundId,
								status: op.status,
								processedAt: now,
							},
						});

					case "upsertDashboard":
						console.log(`⚠️ [WEBHOOK] Upserted refund record for Stripe Dashboard refund ${op.stripeRefundId}`);
						return prisma.refund.upsert({
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
				}
			})
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
	currentPaymentStatus: PaymentStatus
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
 * Envoie un email de confirmation de remboursement au client
 */
export async function sendRefundConfirmation(
	customerEmail: string,
	orderNumber: string,
	customerName: string,
	totalRefunded: number,
	orderTotal: number,
	isFullyRefunded: boolean,
	reason: string
): Promise<void> {
	try {
		const baseUrl = getBaseUrl();
		const orderDetailsUrl = `${baseUrl}${ROUTES.ACCOUNT.ORDER_DETAIL(orderNumber)}`;

		await sendRefundConfirmationEmail({
			to: customerEmail,
			orderNumber,
			customerName,
			refundAmount: totalRefunded,
			originalOrderTotal: orderTotal,
			reason: reason.toUpperCase(),
			isPartialRefund: !isFullyRefunded,
			orderDetailsUrl,
		});

		console.log(`✅ [WEBHOOK] Refund confirmation email sent to ${customerEmail}`);
	} catch (emailError) {
		console.error("❌ [WEBHOOK] Error sending refund confirmation email:", emailError);
	}
}

/**
 * Trouve un remboursement par son ID Stripe ou par metadata
 */
export async function findRefundByStripeId(
	stripeRefundId: string,
	metadataRefundId?: string
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

	return statusMap[stripeStatus || "pending"] || RefundStatus.PENDING;
}

/**
 * Met à jour le statut d'un remboursement avec historique
 */
export async function updateRefundStatus(
	refundId: string,
	newStatus: RefundStatus,
	stripeStatus: string
): Promise<void> {
	await prisma.$transaction(async (tx) => {
		await tx.refund.update({
			where: { id: refundId },
			data: {
				status: newStatus,
				processedAt: newStatus === RefundStatus.COMPLETED ? new Date() : undefined,
			},
		});

		await tx.refundHistory.create({
			data: {
				refundId,
				action: newStatus === RefundStatus.COMPLETED ? RefundAction.COMPLETED : RefundAction.FAILED,
				note: `Mis à jour via webhook Stripe (status: ${stripeStatus})`,
			},
		});
	});

	console.log(`✅ [WEBHOOK] Refund ${refundId} status updated to ${newStatus}`);
}

/**
 * Marque un remboursement comme échoué avec historique
 */
export async function markRefundAsFailed(
	refundId: string,
	failureReason: string
): Promise<void> {
	await prisma.$transaction(async (tx) => {
		await tx.refund.update({
			where: { id: refundId },
			data: {
				status: RefundStatus.FAILED,
				failureReason,
			},
		});

		await tx.refundHistory.create({
			data: {
				refundId,
				action: RefundAction.FAILED,
				note: `Échec Stripe: ${failureReason}`,
			},
		});
	});

	console.log(`✅ [WEBHOOK] Refund ${refundId} marked as FAILED (reason: ${failureReason})`);
}

/**
 * Envoie une alerte admin pour un remboursement échoué
 */
export async function sendRefundFailedAlert(
	refund: RefundRecord,
	failureReason: string
): Promise<void> {
	try {
		const baseUrl = getBaseUrl();
		const dashboardUrl = `${baseUrl}/admin/ventes/remboursements`;

		await sendAdminRefundFailedAlert({
			orderNumber: refund.order.orderNumber,
			customerEmail: refund.order.customerEmail || "Email non disponible",
			amount: refund.amount,
			reason: "other",
			errorMessage: `Échec remboursement Stripe: ${failureReason}`,
			stripePaymentIntentId: refund.order.stripePaymentIntentId || "",
			dashboardUrl,
		});

		console.log(`🚨 [WEBHOOK] Admin alert sent for failed refund on order ${refund.order.orderNumber}`);
	} catch (emailError) {
		console.error("❌ [WEBHOOK] Error sending refund failure alert:", emailError);
	}
}
