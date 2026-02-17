import Stripe from "stripe";
import { prisma } from "@/shared/lib/prisma";
import { getBaseUrl, ROUTES } from "@/shared/constants/urls";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import type { WebhookHandlerResult } from "../types/webhook.types";

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

const SYSTEM_AUTHOR_ID = "system";
const SYSTEM_AUTHOR_NAME = "Système (webhook Stripe)";

/**
 * Handles charge.dispute.created — A customer opened a chargeback
 * 1. Find the order via the dispute's payment_intent
 * 2. Create an OrderNote with dispute details
 * 3. Send admin alert with dispute details and deadline
 */
export async function handleDisputeCreated(
	dispute: Stripe.Dispute
): Promise<WebhookHandlerResult | null> {
	const paymentIntentId =
		typeof dispute.payment_intent === "string"
			? dispute.payment_intent
			: dispute.payment_intent?.id;

	if (!paymentIntentId) {
		console.error("❌ [WEBHOOK] Dispute without payment_intent:", dispute.id);
		return null;
	}

	const order = await prisma.order.findFirst({
		where: { stripePaymentIntentId: paymentIntentId },
		select: {
			id: true,
			orderNumber: true,
			customerEmail: true,
		},
	});

	if (!order) {
		console.warn(`⚠️ [WEBHOOK] No order found for disputed PI ${paymentIntentId}`);
		return null;
	}

	// Create an OrderNote with dispute details
	const deadlineStr = dispute.evidence_details?.due_by
		? new Date(dispute.evidence_details.due_by * 1000).toLocaleDateString("fr-FR")
		: "N/A";
	const noteContent = `[LITIGE OUVERT] Litige Stripe ${dispute.id}. Raison: ${DISPUTE_REASON_LABELS[dispute.reason] || dispute.reason}. Montant contesté: ${dispute.amount} centimes. Deadline de réponse: ${deadlineStr}.`;

	await prisma.orderNote.create({
		data: {
			orderId: order.id,
			content: noteContent,
			authorId: SYSTEM_AUTHOR_ID,
			authorName: SYSTEM_AUTHOR_NAME,
		},
	});

	console.log(`⚠️ [WEBHOOK] Dispute ${dispute.id} created for order ${order.orderNumber}`);

	const baseUrl = getBaseUrl();
	const dashboardUrl = `${baseUrl}${ROUTES.ADMIN.ORDER_DETAIL(order.id)}`;
	const stripeDashboardUrl = `https://dashboard.stripe.com/disputes/${dispute.id}`;

	return {
		success: true,
		tasks: [
			{
				type: "ADMIN_DISPUTE_ALERT",
				data: {
					orderNumber: order.orderNumber,
					customerEmail: order.customerEmail || "Email non disponible",
					amount: dispute.amount,
					reason: DISPUTE_REASON_LABELS[dispute.reason] || dispute.reason,
					disputeId: dispute.id,
					deadline: dispute.evidence_details?.due_by
						? new Date(dispute.evidence_details.due_by * 1000).toLocaleDateString("fr-FR")
						: null,
					dashboardUrl,
					stripeDashboardUrl,
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
}

/**
 * Handles charge.dispute.closed — A dispute was resolved (won or lost)
 * 1. Create an OrderNote with the outcome
 * 2. If lost: update paymentStatus to REFUNDED (Stripe already debited the amount)
 * 3. Send admin alert with the result
 */
export async function handleDisputeClosed(
	dispute: Stripe.Dispute
): Promise<WebhookHandlerResult | null> {
	const paymentIntentId =
		typeof dispute.payment_intent === "string"
			? dispute.payment_intent
			: dispute.payment_intent?.id;

	if (!paymentIntentId) {
		console.error("❌ [WEBHOOK] Dispute closed without payment_intent:", dispute.id);
		return null;
	}

	const order = await prisma.order.findFirst({
		where: { stripePaymentIntentId: paymentIntentId },
		select: {
			id: true,
			orderNumber: true,
			customerEmail: true,
			paymentStatus: true,
		},
	});

	if (!order) {
		console.warn(`⚠️ [WEBHOOK] No order found for closed dispute PI ${paymentIntentId}`);
		return null;
	}

	const won = dispute.status === "won";
	const statusLabel = won ? "gagné" : "perdu";

	// Create an OrderNote with the outcome
	const noteContent = `[LITIGE CLOTURE] Litige ${dispute.id} clôturé: ${statusLabel}.${!won ? " Le montant a été débité par Stripe." : ""}`;
	await prisma.orderNote.create({
		data: {
			orderId: order.id,
			content: noteContent,
			authorId: SYSTEM_AUTHOR_ID,
			authorName: SYSTEM_AUTHOR_NAME,
		},
	});

	// If lost, Stripe has already debited the amount — mark as REFUNDED
	if (!won && order.paymentStatus !== "REFUNDED") {
		await prisma.order.update({
			where: { id: order.id },
			data: { paymentStatus: "REFUNDED" },
		});
	}

	console.log(`${won ? "✅" : "❌"} [WEBHOOK] Dispute ${dispute.id} closed (${statusLabel}) for order ${order.orderNumber}`);

	const baseUrl = getBaseUrl();
	const dashboardUrl = `${baseUrl}${ROUTES.ADMIN.ORDER_DETAIL(order.id)}`;
	const stripeDashboardUrl = `https://dashboard.stripe.com/disputes/${dispute.id}`;

	return {
		success: true,
		tasks: [
			{
				type: "ADMIN_DISPUTE_ALERT",
				data: {
					orderNumber: order.orderNumber,
					customerEmail: order.customerEmail || "Email non disponible",
					amount: dispute.amount,
					reason: won
						? `Litige clôturé — Vous avez GAGNÉ`
						: `Litige clôturé — Vous avez PERDU (montant débité)`,
					disputeId: dispute.id,
					deadline: null,
					dashboardUrl,
					stripeDashboardUrl,
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
}
