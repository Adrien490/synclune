import Stripe from "stripe";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { sendAdminRefundFailedAlert } from "@/modules/emails/services/admin-emails";
import { getBaseUrl, ROUTES } from "@/shared/constants/urls";
import type { PaymentFailureDetails } from "../types/webhook.types";

// Re-export types for backwards compatibility
export type { PaymentFailureDetails };

/**
 * Met à jour une commande comme payée (via payment_intent.succeeded)
 * NOTE: Ce handler ne gère pas les emails car checkout.session.completed le fait déjà
 * Idempotent: si la commande est déjà PAID, l'opération est ignorée
 */
export async function markOrderAsPaid(orderId: string, paymentIntentId: string): Promise<void> {
	await prisma.$transaction(
		async (tx: Prisma.TransactionClient) => {
			// Vérification d'idempotence
			const order = await tx.order.findUnique({
				where: { id: orderId },
				select: { paymentStatus: true },
			});

			if (!order) {
				console.error(`❌ [WEBHOOK] Order ${orderId} not found in markOrderAsPaid`);
				return;
			}

			if (order.paymentStatus === "PAID") {
				console.log(`⏭️ [WEBHOOK] Order ${orderId} already marked as PAID, skipping`);
				return;
			}

			await tx.order.update({
				where: { id: orderId },
				data: {
					status: "PROCESSING",
					paymentStatus: "PAID",
					stripePaymentIntentId: paymentIntentId,
					paidAt: new Date(),
				},
			});

			console.log(`✅ [WEBHOOK] Order ${orderId} marked as PAID via payment_intent.succeeded`);
		},
		{ timeout: 10000 },
	);
}

/**
 * Extrait les détails d'échec d'un PaymentIntent
 */
export function extractPaymentFailureDetails(
	paymentIntent: Stripe.PaymentIntent,
): PaymentFailureDetails {
	const lastError = paymentIntent.last_payment_error;
	return {
		code: lastError?.code ?? null,
		declineCode: lastError?.decline_code ?? null,
		message: lastError?.message ?? null,
	};
}

/**
 * Restaure le stock pour une commande dont le paiement a échoué
 */
export async function restoreStockForOrder(
	orderId: string,
): Promise<{ shouldRestore: boolean; itemCount: number; restoredSkuIds: string[] }> {
	// All reads and writes inside the transaction to prevent double restoration on concurrent retries
	return prisma.$transaction(
		async (tx) => {
			const order = await tx.order.findUnique({
				where: { id: orderId },
				select: {
					id: true,
					orderNumber: true,
					status: true,
					paymentStatus: true,
					items: {
						select: {
							skuId: true,
							quantity: true,
						},
					},
				},
			});

			if (!order) {
				console.error(`[WEBHOOK] Order ${orderId} not found for stock restoration`);
				return { shouldRestore: false, itemCount: 0, restoredSkuIds: [] };
			}

			// Only restore if stock was decremented (PROCESSING status = payment had succeeded)
			const shouldRestore = order.status === "PROCESSING" || order.paymentStatus === "PAID";

			if (!shouldRestore || order.items.length === 0) {
				return { shouldRestore: false, itemCount: 0, restoredSkuIds: [] };
			}

			// Group quantities by skuId in case multiple items share the same SKU
			const stockUpdates = new Map<string, number>();
			for (const item of order.items) {
				const current = stockUpdates.get(item.skuId) || 0;
				stockUpdates.set(item.skuId, current + item.quantity);
			}

			// Fetch current SKU states to determine if reactivation is appropriate
			const skuIds = Array.from(stockUpdates.keys());
			const skus = await tx.productSku.findMany({
				where: { id: { in: skuIds } },
				select: { id: true, inventory: true, isActive: true },
			});
			const skuMap = new Map(skus.map((s) => [s.id, s]));

			await Promise.all(
				Array.from(stockUpdates.entries()).map(([skuId, quantity]) => {
					const sku = skuMap.get(skuId);
					// Only reactivate if the SKU was auto-deactivated (inventory === 0 and inactive)
					// Don't reactivate SKUs that were manually deactivated by admin (inventory > 0 but inactive)
					const shouldReactivate = sku && !sku.isActive && sku.inventory === 0;

					return tx.productSku.update({
						where: { id: skuId },
						data: {
							inventory: { increment: quantity },
							...(shouldReactivate && { isActive: true }),
						},
					});
				}),
			);

			console.log(
				`[WEBHOOK] Stock restored for ${order.items.length} items on order ${order.orderNumber}`,
			);
			return { shouldRestore: true, itemCount: order.items.length, restoredSkuIds: skuIds };
		},
		{ timeout: 10000 },
	);
}

/**
 * Met à jour une commande comme échouée avec les détails d'erreur
 * Idempotent: if the order is already FAILED, the operation is skipped
 */
export async function markOrderAsFailed(
	orderId: string,
	paymentIntentId: string,
	failureDetails: PaymentFailureDetails,
): Promise<void> {
	await prisma.$transaction(
		async (tx: Prisma.TransactionClient) => {
			const order = await tx.order.findUnique({
				where: { id: orderId },
				select: { paymentStatus: true },
			});

			if (!order) {
				console.error(`❌ [WEBHOOK] Order ${orderId} not found in markOrderAsFailed`);
				return;
			}

			if (order.paymentStatus === "FAILED") {
				console.log(`⏭️ [WEBHOOK] Order ${orderId} already marked as FAILED, skipping`);
				return;
			}

			await tx.order.update({
				where: { id: orderId },
				data: {
					paymentStatus: "FAILED",
					status: "CANCELLED",
					stripePaymentIntentId: paymentIntentId,
					paymentFailureCode: failureDetails.code,
					paymentDeclineCode: failureDetails.declineCode,
					paymentFailureMessage: failureDetails.message,
				},
			});

			console.log(`❌ [WEBHOOK] Order ${orderId} marked as FAILED`);
		},
		{ timeout: 10000 },
	);
}

/**
 * Marque une commande comme annulée
 * Idempotent: if the order is already CANCELLED with FAILED payment, the operation is skipped
 */
export async function markOrderAsCancelled(
	orderId: string,
	paymentIntentId: string,
): Promise<void> {
	await prisma.$transaction(
		async (tx: Prisma.TransactionClient) => {
			const order = await tx.order.findUnique({
				where: { id: orderId },
				select: { status: true, paymentStatus: true },
			});

			if (!order) {
				console.error(`❌ [WEBHOOK] Order ${orderId} not found in markOrderAsCancelled`);
				return;
			}

			if (order.status === "CANCELLED" && order.paymentStatus === "FAILED") {
				console.log(
					`⏭️ [WEBHOOK] Order ${orderId} already CANCELLED with FAILED payment, skipping`,
				);
				return;
			}

			await tx.order.update({
				where: { id: orderId },
				data: {
					status: "CANCELLED",
					paymentStatus: "FAILED",
					stripePaymentIntentId: paymentIntentId,
				},
			});

			console.log(`❌ [WEBHOOK] Order ${orderId} marked as CANCELLED`);
		},
		{ timeout: 10000 },
	);
}

/**
 * Initie un remboursement automatique via Stripe
 */
export async function initiateAutomaticRefund(
	paymentIntentId: string,
	orderId: string,
	reason: string,
): Promise<{ success: boolean; refundId?: string; error?: Error }> {
	try {
		const { stripe } = await import("@/shared/lib/stripe");

		const refund = await stripe.refunds.create(
			{
				payment_intent: paymentIntentId,
				reason: "requested_by_customer",
				metadata: {
					orderId,
					reason,
				},
			},
			{
				idempotencyKey: `auto-refund-${paymentIntentId}`,
			},
		);

		console.log(`✅ [WEBHOOK] Refund created successfully: ${refund.id} for order ${orderId}`);
		return { success: true, refundId: refund.id };
	} catch (error) {
		console.error(`❌ [WEBHOOK] Failed to create refund for order ${orderId}:`, error);
		return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
	}
}

/**
 * Envoie une alerte admin pour un échec de remboursement
 */
export async function sendRefundFailureAlert(
	orderId: string,
	paymentIntentId: string,
	reason: "payment_failed" | "payment_canceled" | "other",
	errorMessage: string,
): Promise<void> {
	try {
		const order = await prisma.order.findUnique({
			where: { id: orderId },
			select: {
				orderNumber: true,
				total: true,
				user: { select: { email: true } },
			},
		});

		if (!order) {
			console.error(`❌ [WEBHOOK] Order not found for refund alert: ${orderId}`);
			return;
		}

		const baseUrl = getBaseUrl();
		const dashboardUrl = `${baseUrl}${ROUTES.ADMIN.ORDER_DETAIL(orderId)}`;

		await sendAdminRefundFailedAlert({
			orderNumber: order.orderNumber,
			customerEmail: order.user?.email || "Email non disponible",
			amount: order.total,
			reason,
			errorMessage,
			stripePaymentIntentId: paymentIntentId,
			dashboardUrl,
		});

		console.log(`🚨 [WEBHOOK] Admin alert sent for failed refund on order ${orderId}`);
	} catch (alertError) {
		console.error(
			`❌ [WEBHOOK] Failed to send refund failure alert for order ${orderId}:`,
			alertError,
		);
	}
}
