import Stripe from "stripe";
import { DisputeReason, DisputeStatus } from "@/app/generated/prisma/client";
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
 * Map Stripe dispute status to our DisputeStatus enum
 */
function mapStripeDisputeStatus(stripeStatus: string): DisputeStatus {
	switch (stripeStatus) {
		case "needs_response": return DisputeStatus.NEEDS_RESPONSE;
		case "under_review": return DisputeStatus.UNDER_REVIEW;
		case "won": return DisputeStatus.WON;
		case "lost": return DisputeStatus.LOST;
		case "charge_refunded": return DisputeStatus.CHARGE_REFUNDED;
		default: return DisputeStatus.NEEDS_RESPONSE;
	}
}

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
		console.error("[WEBHOOK] Dispute without payment_intent:", dispute.id);
		throw new Error(`Dispute ${dispute.id} has no payment_intent`);
	}

	const order = await prisma.order.findUnique({
		where: { stripePaymentIntentId: paymentIntentId },
		select: {
			id: true,
			orderNumber: true,
			customerEmail: true,
		},
	});

	if (!order) {
		console.error(`[WEBHOOK] No order found for disputed PI ${paymentIntentId}`);
		throw new Error(`No order found for dispute ${dispute.id} (PI: ${paymentIntentId})`);
	}

	// Prevent duplicate OrderNote on webhook replay
	const existingNote = await prisma.orderNote.findFirst({
		where: {
			orderId: order.id,
			content: { startsWith: `[LITIGE OUVERT] Litige Stripe ${dispute.id}` },
		},
		select: { id: true },
	});

	if (existingNote) {
		console.log(`[WEBHOOK] Dispute note already exists for ${dispute.id}, skipping creation`);
		return { success: true, skipped: true, reason: "Dispute note already created" };
	}

	// Create Dispute record and OrderNote atomically
	const deadlineStr = dispute.evidence_details?.due_by
		? new Date(dispute.evidence_details.due_by * 1000).toLocaleDateString("fr-FR")
		: "N/A";
	const noteContent = `[LITIGE OUVERT] Litige Stripe ${dispute.id}. Raison: ${DISPUTE_REASON_LABELS[dispute.reason] || dispute.reason}. Montant contesté: ${dispute.amount} centimes. Deadline de réponse: ${deadlineStr}.`;

	const dueBy = dispute.evidence_details?.due_by
		? new Date(dispute.evidence_details.due_by * 1000)
		: null;

	await prisma.$transaction(async (tx) => {
		await tx.dispute.create({
			data: {
				stripeDisputeId: dispute.id,
				orderId: order.id,
				amount: dispute.amount,
				fee: (dispute.balance_transactions?.[0]?.fee ?? 0),
				reason: STRIPE_REASON_MAP[dispute.reason] || DisputeReason.GENERAL,
				status: mapStripeDisputeStatus(dispute.status),
				dueBy,
			},
		});

		await tx.orderNote.create({
			data: {
				orderId: order.id,
				content: noteContent,
				authorId: SYSTEM_AUTHOR_ID,
				authorName: SYSTEM_AUTHOR_NAME,
			},
		});
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
		console.error("[WEBHOOK] Dispute closed without payment_intent:", dispute.id);
		throw new Error(`Dispute ${dispute.id} closed has no payment_intent`);
	}

	const order = await prisma.order.findUnique({
		where: { stripePaymentIntentId: paymentIntentId },
		select: {
			id: true,
			orderNumber: true,
			customerEmail: true,
			paymentStatus: true,
		},
	});

	if (!order) {
		console.error(`[WEBHOOK] No order found for closed dispute PI ${paymentIntentId}`);
		throw new Error(`No order found for closed dispute ${dispute.id} (PI: ${paymentIntentId})`);
	}

	// Prevent duplicate OrderNote on webhook replay
	const existingNote = await prisma.orderNote.findFirst({
		where: {
			orderId: order.id,
			content: { startsWith: `[LITIGE CLOTURE] Litige ${dispute.id}` },
		},
		select: { id: true },
	});

	if (existingNote) {
		console.log(`[WEBHOOK] Dispute closed note already exists for ${dispute.id}, skipping`);
		return { success: true, skipped: true, reason: "Dispute closed note already created" };
	}

	const won = dispute.status === "won";
	const statusLabel = won ? "gagné" : "perdu";

	// Update Dispute record, create OrderNote, and update order status atomically
	const noteContent = `[LITIGE CLOTURE] Litige ${dispute.id} clôturé: ${statusLabel}.${!won ? " Le montant a été débité par Stripe." : ""}`;

	await prisma.$transaction(async (tx) => {
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

		// If lost, Stripe has already debited the amount — mark as REFUNDED
		if (!won && order.paymentStatus !== "REFUNDED") {
			await tx.order.update({
				where: { id: order.id },
				data: { paymentStatus: "REFUNDED" },
			});
		}
	});

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
