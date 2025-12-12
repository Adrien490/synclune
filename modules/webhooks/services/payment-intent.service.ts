import Stripe from "stripe";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { sendAdminRefundFailedAlert } from "@/shared/lib/email";

// Types pour les résultats des services
export interface PaymentFailureDetails {
	code: string | null;
	declineCode: string | null;
	message: string | null;
}

/**
 * Met à jour une commande comme payée (via payment_intent.succeeded)
 * NOTE: Ce handler ne gère pas les emails car checkout.session.completed le fait déjà
 */
export async function markOrderAsPaid(
	orderId: string,
	paymentIntentId: string
): Promise<void> {
	await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
		await tx.order.update({
			where: { id: orderId },
			data: {
				status: "PROCESSING",
				paymentStatus: "PAID",
				stripePaymentIntentId: paymentIntentId,
				paidAt: new Date(),
			},
		});
	});
}

/**
 * Extrait les détails d'échec d'un PaymentIntent
 */
export function extractPaymentFailureDetails(
	paymentIntent: Stripe.PaymentIntent
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
	orderId: string
): Promise<{ shouldRestore: boolean; itemCount: number }> {
	const order = await prisma.order.findUnique({
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
		console.error(`❌ [WEBHOOK] Order ${orderId} not found for stock restoration`);
		return { shouldRestore: false, itemCount: 0 };
	}

	// Vérifier si le stock a été décrémenté (statut PROCESSING = paiement avait réussi)
	const shouldRestore = order.status === "PROCESSING" || order.paymentStatus === "PAID";

	if (!shouldRestore || order.items.length === 0) {
		return { shouldRestore: false, itemCount: 0 };
	}

	// Restaurer le stock dans une transaction
	await prisma.$transaction(async (tx) => {
		for (const item of order.items) {
			await tx.productSku.update({
				where: { id: item.skuId },
				data: {
					inventory: { increment: item.quantity },
					isActive: true,
				},
			});
		}
	});

	console.log(`📦 [WEBHOOK] Stock restored for ${order.items.length} items on order ${order.orderNumber}`);
	return { shouldRestore: true, itemCount: order.items.length };
}

/**
 * Met à jour une commande comme échouée avec les détails d'erreur
 */
export async function markOrderAsFailed(
	orderId: string,
	paymentIntentId: string,
	failureDetails: PaymentFailureDetails
): Promise<void> {
	await prisma.order.update({
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
}

/**
 * Marque une commande comme annulée
 */
export async function markOrderAsCancelled(
	orderId: string,
	paymentIntentId: string
): Promise<void> {
	await prisma.order.update({
		where: { id: orderId },
		data: {
			status: "CANCELLED",
			paymentStatus: "FAILED",
			stripePaymentIntentId: paymentIntentId,
		},
	});
}

/**
 * Initie un remboursement automatique via Stripe
 */
export async function initiateAutomaticRefund(
	paymentIntentId: string,
	orderId: string,
	reason: string
): Promise<{ success: boolean; refundId?: string; error?: Error }> {
	try {
		const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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
				idempotencyKey: `auto-refund-${reason.replace(/\s+/g, "-").toLowerCase()}-${paymentIntentId}`,
			}
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
	errorMessage: string
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

		const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || "https://synclune.fr";
		const dashboardUrl = `${baseUrl}/dashboard/orders/${orderId}`;

		await sendAdminRefundFailedAlert({
			orderNumber: order.orderNumber,
			orderId,
			customerEmail: order.user?.email || "Email non disponible",
			amount: order.total,
			reason,
			errorMessage,
			stripePaymentIntentId: paymentIntentId,
			dashboardUrl,
		});

		console.log(`🚨 [WEBHOOK] Admin alert sent for failed refund on order ${orderId}`);
	} catch (alertError) {
		console.error(`❌ [WEBHOOK] Failed to send refund failure alert for order ${orderId}:`, alertError);
	}
}
