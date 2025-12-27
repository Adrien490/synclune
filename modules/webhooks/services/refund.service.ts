import Stripe from "stripe";
import { PaymentStatus, RefundStatus, RefundAction, CurrencyCode } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { sendRefundConfirmationEmail } from "@/modules/emails/services/refund-emails";
import { sendAdminRefundFailedAlert } from "@/modules/emails/services/admin-emails";

// Types pour les résultats des services
export interface RefundSyncResult {
	processed: boolean;
	isFullyRefunded: boolean;
	totalRefunded: number;
}

export interface RefundRecord {
	id: string;
	status: RefundStatus;
	amount: number;
	orderId: string;
	order: {
		id: string;
		orderNumber: string;
		customerEmail: string | null;
		stripePaymentIntentId: string | null;
	};
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
				await prisma.refund.update({
					where: { id: existingRefund.id },
					data: { status: RefundStatus.COMPLETED },
				});
				console.log(`✅ [WEBHOOK] Refund ${existingRefund.id} marked as COMPLETED`);
			}
		} else {
			// Nouveau remboursement - peut venir de l'app ou du Dashboard Stripe
			const refundId = stripeRefund.metadata?.refund_id;

			if (refundId) {
				// Remboursement créé via notre app - le lier
				await prisma.refund.update({
					where: { id: refundId },
					data: {
						stripeRefundId: stripeRefund.id,
						status: stripeRefund.status === "succeeded"
							? RefundStatus.COMPLETED
							: RefundStatus.PENDING,
						processedAt: new Date(),
					},
				});
				console.log(`✅ [WEBHOOK] Linked existing refund ${refundId} to Stripe refund ${stripeRefund.id}`);
			} else {
				// Remboursement fait depuis Stripe Dashboard - upsert pour idempotence
				await prisma.refund.upsert({
					where: { stripeRefundId: stripeRefund.id },
					create: {
						orderId,
						stripeRefundId: stripeRefund.id,
						amount: stripeRefund.amount || 0,
						currency: (stripeRefund.currency?.toUpperCase() || "EUR") as CurrencyCode,
						reason: "OTHER",
						status: stripeRefund.status === "succeeded"
							? RefundStatus.COMPLETED
							: RefundStatus.PENDING,
						note: "Remboursement effectué via Dashboard Stripe",
						processedAt: new Date(),
					},
					update: {
						status: stripeRefund.status === "succeeded"
							? RefundStatus.COMPLETED
							: RefundStatus.PENDING,
						processedAt: new Date(),
					},
				});
				console.log(`⚠️ [WEBHOOK] Upserted refund record for Stripe Dashboard refund ${stripeRefund.id}`);
			}
		}
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
		const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || "https://synclune.fr";
		const orderDetailsUrl = `${baseUrl}/mon-compte/commandes/${orderNumber}`;

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
export function mapStripeRefundStatus(stripeStatus: string | undefined): RefundStatus {
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
		const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || "https://synclune.fr";
		const dashboardUrl = `${baseUrl}/admin/ventes/remboursements`;

		await sendAdminRefundFailedAlert({
			orderNumber: refund.order.orderNumber,
			orderId: refund.order.id,
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
