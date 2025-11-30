import Stripe from "stripe";
import { prisma } from "@/shared/lib/prisma";
import { sendAdminDisputeAlert } from "@/shared/lib/email";

/**
 * ⚠️ Gère les litiges/chargebacks
 * CRITIQUE : Un chargeback peut coûter 15€+ de frais et entraîner des pénalités
 *
 * Actions requises :
 * 1. Alerter immédiatement l'admin
 * 2. Bloquer les nouvelles commandes du client (optionnel)
 * 3. Préparer les preuves (facture, tracking, emails)
 */
export async function handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
	console.log(`⚠️ [WEBHOOK] Dispute created: ${dispute.id}`);

	try {
		// 1. Trouver la commande associée via le payment intent
		const paymentIntentId = typeof dispute.payment_intent === "string"
			? dispute.payment_intent
			: dispute.payment_intent?.id;

		if (!paymentIntentId) {
			console.error("❌ [WEBHOOK] No payment intent found for dispute");
			return;
		}

		const order = await prisma.order.findUnique({
			where: { stripePaymentIntentId: paymentIntentId },
			select: {
				id: true,
				orderNumber: true,
				customerEmail: true,
				customerName: true,
				total: true,
				stripeInvoiceId: true,
				trackingNumber: true,
				shippedAt: true,
				actualDelivery: true,
				user: {
					select: { id: true, email: true },
				},
			},
		});

		if (!order) {
			console.warn(`⚠️ [WEBHOOK] Order not found for disputed payment intent ${paymentIntentId}`);
			return;
		}

		// 2. Log pour traçabilité (Dashboard Stripe = source de vérité)
		console.log(`[AUDIT] Dispute created`, {
			orderId: order.id,
			orderNumber: order.orderNumber,
			disputeId: dispute.id,
			reason: dispute.reason,
			amount: dispute.amount,
			currency: dispute.currency,
			status: dispute.status,
			evidenceDueBy: dispute.evidence_details?.due_by
				? new Date(dispute.evidence_details.due_by * 1000).toISOString()
				: null,
		});

		// 3. Alerter l'admin par email
		const disputeAmount = dispute.amount / 100;
		const evidenceDueDate = dispute.evidence_details?.due_by
			? new Date(dispute.evidence_details.due_by * 1000).toLocaleDateString("fr-FR")
			: "Non spécifiée";

		console.log(`
🚨🚨🚨 ALERTE LITIGE / CHARGEBACK 🚨🚨🚨

Commande: ${order.orderNumber}
Client: ${order.customerName} (${order.customerEmail})
Montant contesté: ${disputeAmount}€
Raison: ${dispute.reason || "Non spécifiée"}
Date limite pour preuves: ${evidenceDueDate}

ACTIONS REQUISES:
1. Rassembler les preuves de livraison (tracking, signature)
2. Préparer la facture Stripe
3. Répondre dans le Dashboard Stripe AVANT la date limite

Lien Dashboard: https://dashboard.stripe.com/disputes/${dispute.id}
		`);

		// 4. Envoyer un email d'alerte à l'admin
		try {
			const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || "https://synclune.fr";
			const dashboardUrl = `${baseUrl}/admin/ventes/commandes/${order.id}`;

			await sendAdminDisputeAlert({
				orderNumber: order.orderNumber,
				orderId: order.id,
				customerEmail: order.customerEmail || "Email non disponible",
				customerName: order.customerName || "Client",
				disputeAmount: dispute.amount,
				disputeReason: dispute.reason || "general",
				evidenceDueDate,
				stripeDisputeId: dispute.id,
				stripePaymentIntentId: paymentIntentId,
				dashboardUrl,
			});

			console.log(`✅ [WEBHOOK] Admin dispute alert email sent for order ${order.orderNumber}`);
		} catch (emailError) {
			console.error("❌ [WEBHOOK] Error sending admin dispute alert email:", emailError);
			// Ne pas bloquer le webhook si l'email échoue
		}
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling dispute created:`, error);
		throw error; // Propager pour marquer l'événement comme FAILED
	}
}
