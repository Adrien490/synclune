import Stripe from "stripe";
import { prisma } from "@/shared/lib/prisma";
import { sendAdminDisputeAlert } from "@/shared/lib/email";
import { DisputeStatus } from "@/app/generated/prisma/client";

/**
 * Mappe le statut Stripe vers notre enum DisputeStatus
 */
function mapStripeDisputeStatus(stripeStatus: Stripe.Dispute.Status): DisputeStatus {
	switch (stripeStatus) {
		case "needs_response":
			return DisputeStatus.NEEDS_RESPONSE;
		case "under_review":
			return DisputeStatus.UNDER_REVIEW;
		case "won":
			return DisputeStatus.WON;
		case "lost":
			return DisputeStatus.LOST;
		case "warning_needs_response":
			return DisputeStatus.NEEDS_RESPONSE;
		case "warning_under_review":
			return DisputeStatus.UNDER_REVIEW;
		case "warning_closed":
			return DisputeStatus.ACCEPTED;
		default:
			// Gérer les statuts non documentés qui peuvent apparaître
			// Cast en string pour éviter les erreurs TypeScript
			const statusStr = stripeStatus as string;
			if (statusStr === "charge_refunded") {
				return DisputeStatus.CHARGE_REFUNDED;
			}
			console.warn(`⚠️ Unknown dispute status: ${stripeStatus}, defaulting to NEEDS_RESPONSE`);
			return DisputeStatus.NEEDS_RESPONSE;
	}
}

/**
 * Extrait le payment intent ID depuis un dispute
 */
function getPaymentIntentId(dispute: Stripe.Dispute): string | null {
	if (typeof dispute.payment_intent === "string") {
		return dispute.payment_intent;
	}
	return dispute.payment_intent?.id ?? null;
}

/**
 * ⚠️ Gère les litiges/chargebacks - Création
 * CRITIQUE : Un chargeback peut coûter 15€+ de frais et entraîner des pénalités
 */
export async function handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
	console.log(`⚠️ [WEBHOOK] Dispute created: ${dispute.id}`);

	try {
		const paymentIntentId = getPaymentIntentId(dispute);

		if (!paymentIntentId) {
			console.error("❌ [WEBHOOK] No payment intent found for dispute");
			return;
		}

		// 1. Trouver la commande associée
		const order = await prisma.order.findUnique({
			where: { stripePaymentIntentId: paymentIntentId },
			select: {
				id: true,
				orderNumber: true,
				customerEmail: true,
				customerName: true,
				total: true,
				currency: true,
				stripeInvoiceId: true,
				trackingNumber: true,
				shippedAt: true,
				actualDelivery: true,
			},
		});

		if (!order) {
			console.warn(`⚠️ [WEBHOOK] Order not found for disputed payment intent ${paymentIntentId}`);
			return;
		}

		// 2. Créer ou mettre à jour le Dispute en base
		const evidenceDueBy = dispute.evidence_details?.due_by
			? new Date(dispute.evidence_details.due_by * 1000)
			: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 jours

		await prisma.dispute.upsert({
			where: { stripeDisputeId: dispute.id },
			create: {
				stripeDisputeId: dispute.id,
				orderId: order.id,
				amount: dispute.amount,
				currency: order.currency,
				reason: dispute.reason || "general",
				networkReasonCode: dispute.network_reason_code ?? null,
				status: mapStripeDisputeStatus(dispute.status),
				evidenceDueBy,
			},
			update: {
				status: mapStripeDisputeStatus(dispute.status),
				reason: dispute.reason || "general",
			},
		});

		console.log(`✅ [WEBHOOK] Dispute ${dispute.id} saved to database`);

		// 3. Log pour traçabilité
		console.log(`[AUDIT] Dispute created`, {
			orderId: order.id,
			orderNumber: order.orderNumber,
			disputeId: dispute.id,
			reason: dispute.reason,
			amount: dispute.amount,
			currency: dispute.currency,
			status: dispute.status,
			evidenceDueBy: evidenceDueBy.toISOString(),
		});

		// 4. Alerter l'admin par email
		const disputeAmount = dispute.amount / 100;
		const evidenceDueDate = evidenceDueBy.toLocaleDateString("fr-FR");

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

		// 5. Envoyer un email d'alerte à l'admin
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
		}
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling dispute created:`, error);
		throw error;
	}
}

/**
 * Gère les mises à jour de litige (changement de statut)
 */
export async function handleDisputeUpdated(dispute: Stripe.Dispute): Promise<void> {
	console.log(`📝 [WEBHOOK] Dispute updated: ${dispute.id} -> ${dispute.status}`);

	try {
		const existingDispute = await prisma.dispute.findUnique({
			where: { stripeDisputeId: dispute.id },
		});

		if (!existingDispute) {
			// Si le dispute n'existe pas, on le crée (cas de replay ou ordre d'events)
			console.warn(`⚠️ [WEBHOOK] Dispute ${dispute.id} not found, creating...`);
			await handleDisputeCreated(dispute);
			return;
		}

		const newStatus = mapStripeDisputeStatus(dispute.status);

		await prisma.dispute.update({
			where: { stripeDisputeId: dispute.id },
			data: {
				status: newStatus,
				reason: dispute.reason || existingDispute.reason,
			},
		});

		console.log(`✅ [WEBHOOK] Dispute ${dispute.id} status updated to ${newStatus}`);

		console.log(`[AUDIT] Dispute updated`, {
			disputeId: dispute.id,
			previousStatus: existingDispute.status,
			newStatus,
			reason: dispute.reason,
		});
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling dispute updated:`, error);
		throw error;
	}
}

/**
 * Gère la clôture d'un litige (WON, LOST, CHARGE_REFUNDED)
 */
export async function handleDisputeClosed(dispute: Stripe.Dispute): Promise<void> {
	console.log(`🏁 [WEBHOOK] Dispute closed: ${dispute.id} -> ${dispute.status}`);

	try {
		const existingDispute = await prisma.dispute.findUnique({
			where: { stripeDisputeId: dispute.id },
			include: { order: { select: { orderNumber: true } } },
		});

		if (!existingDispute) {
			console.warn(`⚠️ [WEBHOOK] Dispute ${dispute.id} not found for closure`);
			return;
		}

		const newStatus = mapStripeDisputeStatus(dispute.status);

		await prisma.dispute.update({
			where: { stripeDisputeId: dispute.id },
			data: {
				status: newStatus,
				resolvedAt: new Date(),
			},
		});

		const outcome = dispute.status === "won" ? "✅ GAGNÉ" : dispute.status === "lost" ? "❌ PERDU" : "🔄 REMBOURSÉ";

		console.log(`
🏁 LITIGE RÉSOLU - ${outcome}

Commande: ${existingDispute.order.orderNumber}
Dispute ID: ${dispute.id}
Montant: ${dispute.amount / 100}€
Résultat: ${dispute.status}
		`);

		console.log(`[AUDIT] Dispute closed`, {
			disputeId: dispute.id,
			orderId: existingDispute.orderId,
			orderNumber: existingDispute.order.orderNumber,
			outcome: dispute.status,
			amount: dispute.amount,
		});
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling dispute closed:`, error);
		throw error;
	}
}

/**
 * Gère le retrait des fonds (litige perdu)
 */
export async function handleDisputeFundsWithdrawn(dispute: Stripe.Dispute): Promise<void> {
	console.log(`💸 [WEBHOOK] Dispute funds withdrawn: ${dispute.id}`);

	try {
		const existingDispute = await prisma.dispute.findUnique({
			where: { stripeDisputeId: dispute.id },
			include: { order: { select: { orderNumber: true, customerEmail: true } } },
		});

		if (!existingDispute) {
			console.warn(`⚠️ [WEBHOOK] Dispute ${dispute.id} not found for funds withdrawal`);
			return;
		}

		console.log(`
💸💸💸 FONDS RETIRÉS - LITIGE PERDU 💸💸💸

Commande: ${existingDispute.order.orderNumber}
Client: ${existingDispute.order.customerEmail}
Montant perdu: ${dispute.amount / 100}€ + 15€ frais
Dispute ID: ${dispute.id}

⚠️ Vérifier le compte Stripe pour l'impact sur le solde
		`);

		console.log(`[AUDIT] Dispute funds withdrawn`, {
			disputeId: dispute.id,
			orderId: existingDispute.orderId,
			amount: dispute.amount,
		});
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling dispute funds withdrawn:`, error);
		throw error;
	}
}

/**
 * Gère la restitution des fonds (litige gagné)
 */
export async function handleDisputeFundsReinstated(dispute: Stripe.Dispute): Promise<void> {
	console.log(`💰 [WEBHOOK] Dispute funds reinstated: ${dispute.id}`);

	try {
		const existingDispute = await prisma.dispute.findUnique({
			where: { stripeDisputeId: dispute.id },
			include: { order: { select: { orderNumber: true, customerEmail: true } } },
		});

		if (!existingDispute) {
			console.warn(`⚠️ [WEBHOOK] Dispute ${dispute.id} not found for funds reinstatement`);
			return;
		}

		console.log(`
💰💰💰 FONDS RESTITUÉS - LITIGE GAGNÉ 💰💰💰

Commande: ${existingDispute.order.orderNumber}
Client: ${existingDispute.order.customerEmail}
Montant récupéré: ${dispute.amount / 100}€
Dispute ID: ${dispute.id}

✅ Les fonds ont été recrédités sur votre compte Stripe
		`);

		console.log(`[AUDIT] Dispute funds reinstated`, {
			disputeId: dispute.id,
			orderId: existingDispute.orderId,
			amount: dispute.amount,
		});
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling dispute funds reinstated:`, error);
		throw error;
	}
}
