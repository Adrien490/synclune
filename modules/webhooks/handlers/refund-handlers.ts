import Stripe from "stripe";
import { PaymentStatus, RefundStatus, RefundAction, CurrencyCode } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { sendRefundConfirmationEmail, sendAdminRefundFailedAlert } from "@/shared/lib/email";

/**
 * 💰 Gère les remboursements
 * Synchronise les remboursements Stripe avec la base de données
 * Gère aussi les remboursements effectués directement via le Dashboard Stripe
 */
export async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
	console.log(`💰 [WEBHOOK] Charge refunded: ${charge.id}`);

	try {
		// 1. Récupérer le payment intent associé
		const paymentIntentId = typeof charge.payment_intent === "string"
			? charge.payment_intent
			: charge.payment_intent?.id;

		if (!paymentIntentId) {
			console.error("❌ [WEBHOOK] No payment intent found for refunded charge");
			return;
		}

		// 2. Trouver la commande via payment intent
		const order = await prisma.order.findUnique({
			where: { stripePaymentIntentId: paymentIntentId },
			select: {
				id: true,
				orderNumber: true,
				total: true,
				paymentStatus: true,
				customerEmail: true,
				customerName: true,
				refunds: {
					select: {
						id: true,
						amount: true,
						status: true,
						stripeRefundId: true,
					},
				},
			},
		});

		if (!order) {
			console.warn(`⚠️ [WEBHOOK] Order not found for payment intent ${paymentIntentId}`);
			return;
		}

		// 3. Récupérer les derniers remboursements Stripe pour cette charge
		const stripeRefunds = charge.refunds?.data || [];

		for (const stripeRefund of stripeRefunds) {
			if (!stripeRefund.id) continue;

			// Vérifier si ce remboursement existe déjà dans notre base
			const existingRefund = order.refunds.find(
				(r) => r.stripeRefundId === stripeRefund.id
			);

			if (existingRefund) {
				// Mettre à jour le statut si nécessaire (ex: PENDING → COMPLETED)
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
				// ⚠️ Remboursement fait depuis le Dashboard Stripe
				// Créer un enregistrement Refund pour la traçabilité comptable
				const refundId = stripeRefund.metadata?.refund_id;

				// Si on a un refund_id dans les métadonnées, c'est qu'il a été créé via notre app
				// mais n'a pas encore été lié - on le lie maintenant
				if (refundId) {
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
					// Remboursement fait entièrement depuis Stripe Dashboard
					// 🔴 UPSERT pour idempotence (Best Practice Stripe 2025)
					// Évite les doublons si le webhook est rejoué
					await prisma.refund.upsert({
						where: { stripeRefundId: stripeRefund.id },
						create: {
							orderId: order.id,
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
							// Si existe déjà, mettre à jour le statut
							status: stripeRefund.status === "succeeded"
								? RefundStatus.COMPLETED
								: RefundStatus.PENDING,
							processedAt: new Date(),
						},
					});
					console.log(
						`⚠️ [WEBHOOK] Upserted refund record for Stripe Dashboard refund ${stripeRefund.id}`
					);
				}
			}
		}

		// 4. Calculer le total remboursé et mettre à jour le statut de paiement
		const totalRefundedOnStripe = charge.amount_refunded || 0;
		const isFullyRefunded = totalRefundedOnStripe >= order.total;
		const isPartiallyRefunded = totalRefundedOnStripe > 0 && totalRefundedOnStripe < order.total;

		if (isFullyRefunded && order.paymentStatus !== PaymentStatus.REFUNDED) {
			await prisma.order.update({
				where: { id: order.id },
				data: { paymentStatus: PaymentStatus.REFUNDED },
			});
			console.log(`✅ [WEBHOOK] Order ${order.orderNumber} marked as REFUNDED (total)`);
		} else if (isPartiallyRefunded && order.paymentStatus !== PaymentStatus.PARTIALLY_REFUNDED && order.paymentStatus !== PaymentStatus.REFUNDED) {
			await prisma.order.update({
				where: { id: order.id },
				data: { paymentStatus: PaymentStatus.PARTIALLY_REFUNDED },
			});
			console.log(`✅ [WEBHOOK] Order ${order.orderNumber} marked as PARTIALLY_REFUNDED (${totalRefundedOnStripe / 100}€ / ${order.total / 100}€)`);
		}

		console.log(
			`📄 [WEBHOOK] Refund processed for order ${order.orderNumber} ` +
			`(${isFullyRefunded ? 'total' : 'partial'}: ${totalRefundedOnStripe / 100}€)`
		);

		// 5. Envoyer email de confirmation au client
		if (order.customerEmail) {
			try {
				const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || "https://synclune.fr";
				const orderDetailsUrl = `${baseUrl}/mon-compte/commandes/${order.orderNumber}`;

				// Déterminer la raison du dernier remboursement
				const latestRefund = stripeRefunds[0];
				const reason = latestRefund?.reason || "OTHER";

				await sendRefundConfirmationEmail({
					to: order.customerEmail,
					orderNumber: order.orderNumber,
					customerName: order.customerName || "Client",
					refundAmount: totalRefundedOnStripe,
					originalOrderTotal: order.total,
					reason: reason.toUpperCase(),
					isPartialRefund: !isFullyRefunded,
					orderDetailsUrl,
				});

				console.log(`✅ [WEBHOOK] Refund confirmation email sent to ${order.customerEmail}`);
			} catch (emailError) {
				console.error("❌ [WEBHOOK] Error sending refund confirmation email:", emailError);
				// Ne pas bloquer le webhook si l'email échoue
			}
		}
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling charge refunded:`, error);
		// Ne pas throw pour ne pas bloquer le webhook
	}
}

/**
 * 💰 Gère les événements refund.created et refund.updated
 * Synchronise le statut du remboursement avec la base de données
 */
export async function handleRefundUpdated(stripeRefund: Stripe.Refund): Promise<void> {
	console.log(`💰 [WEBHOOK] Refund updated: ${stripeRefund.id}, status: ${stripeRefund.status}`);

	try {
		// 1. Trouver le remboursement local via stripeRefundId
		let refund = await prisma.refund.findUnique({
			where: { stripeRefundId: stripeRefund.id },
			select: {
				id: true,
				status: true,
				orderId: true,
				order: {
					select: { orderNumber: true },
				},
			},
		});

		// 2. Si pas trouvé via stripeRefundId, essayer via metadata
		if (!refund && stripeRefund.metadata?.refund_id) {
			refund = await prisma.refund.findUnique({
				where: { id: stripeRefund.metadata.refund_id },
				select: {
					id: true,
					status: true,
					orderId: true,
					order: {
						select: { orderNumber: true },
					},
				},
			});

			// Lier le stripeRefundId si trouvé
			if (refund) {
				await prisma.refund.update({
					where: { id: refund.id },
					data: { stripeRefundId: stripeRefund.id },
				});
			}
		}

		if (!refund) {
			console.log(`ℹ️ [WEBHOOK] Refund ${stripeRefund.id} not found in database (may be external)`);
			return;
		}

		// 3. Mapper le statut Stripe vers notre statut
		const statusMap: Record<string, RefundStatus> = {
			succeeded: RefundStatus.COMPLETED,
			pending: RefundStatus.APPROVED,
			failed: RefundStatus.FAILED,
			canceled: RefundStatus.CANCELLED,
		};

		const newStatus = statusMap[stripeRefund.status || "pending"];

		// 4. Mettre à jour si le statut a changé
		if (newStatus && refund.status !== newStatus) {
			await prisma.$transaction(async (tx) => {
				// Update refund status
				await tx.refund.update({
					where: { id: refund.id },
					data: {
						status: newStatus,
						processedAt: newStatus === RefundStatus.COMPLETED ? new Date() : undefined,
					},
				});

				// Ajouter à l'historique
				await tx.refundHistory.create({
					data: {
						refundId: refund.id,
						action: newStatus === RefundStatus.COMPLETED ? RefundAction.COMPLETED : RefundAction.FAILED,
						note: `Mis à jour via webhook Stripe (status: ${stripeRefund.status})`,
					},
				});
			});

			console.log(`✅ [WEBHOOK] Refund ${refund.id} status updated to ${newStatus}`);
		}
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling refund updated:`, error);
		// Ne pas throw pour ne pas bloquer le webhook
	}
}

/**
 * ❌ Gère les échecs de remboursement
 * Marque le remboursement comme FAILED et alerte l'admin
 */
export async function handleRefundFailed(stripeRefund: Stripe.Refund): Promise<void> {
	console.log(`❌ [WEBHOOK] Refund failed: ${stripeRefund.id}`);

	try {
		// 1. Trouver le remboursement local
		let refund = await prisma.refund.findUnique({
			where: { stripeRefundId: stripeRefund.id },
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

		// 2. Si pas trouvé via stripeRefundId, essayer via metadata
		if (!refund && stripeRefund.metadata?.refund_id) {
			refund = await prisma.refund.findUnique({
				where: { id: stripeRefund.metadata.refund_id },
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
		}

		if (!refund) {
			console.warn(`⚠️ [WEBHOOK] Failed refund ${stripeRefund.id} not found in database`);
			return;
		}

		// 3. Marquer comme FAILED avec historique et stocker la raison d'échec
		const failureReason = stripeRefund.failure_reason || "unknown";

		await prisma.$transaction(async (tx) => {
			await tx.refund.update({
				where: { id: refund.id },
				data: {
					status: RefundStatus.FAILED,
					failureReason, // Stocker le code d'échec Stripe
				},
			});

			await tx.refundHistory.create({
				data: {
					refundId: refund.id,
					action: RefundAction.FAILED,
					note: `Échec Stripe: ${failureReason}`,
				},
			});
		});

		console.log(`✅ [WEBHOOK] Refund ${refund.id} marked as FAILED (reason: ${failureReason})`);

		// 4. Alerter l'admin
		try {
			const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || "https://synclune.fr";
			const dashboardUrl = `${baseUrl}/admin/ventes/remboursements`;

			await sendAdminRefundFailedAlert({
				orderNumber: refund.order.orderNumber,
				orderId: refund.order.id,
				customerEmail: refund.order.customerEmail || "Email non disponible",
				amount: refund.amount,
				reason: "other",
				errorMessage: `Échec remboursement Stripe: ${stripeRefund.failure_reason || "Raison inconnue"}`,
				stripePaymentIntentId: refund.order.stripePaymentIntentId || "",
				dashboardUrl,
			});

			console.log(`🚨 [WEBHOOK] Admin alert sent for failed refund on order ${refund.order.orderNumber}`);
		} catch (emailError) {
			console.error("❌ [WEBHOOK] Error sending refund failure alert:", emailError);
		}
	} catch (error) {
		console.error(`❌ [WEBHOOK] Error handling refund failed:`, error);
		// Ne pas throw pour ne pas bloquer le webhook
	}
}
