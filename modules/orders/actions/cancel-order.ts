"use server";

import { OrderStatus, PaymentStatus } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { prisma } from "@/shared/lib/prisma";
import { sendCancelOrderConfirmationEmail } from "@/shared/lib/email";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { cancelOrderSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";

/**
 * Annule une commande
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - Passe le statut de la commande à CANCELLED
 * - Si la commande était payée, passe le paymentStatus à REFUNDED
 * - Remet le stock (inventory) des SKUs à jour (incrémentation)
 * - Préserve l'intégrité comptable (la commande reste en base avec son invoiceNumber)
 * - Une commande déjà annulée ne peut pas être annulée à nouveau
 */
export async function cancelOrder(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const admin = await isAdmin();
		if (!admin) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Accès non autorisé",
			};
		}

		// Récupérer les infos de l'admin pour l'audit trail
		const session = await getSession();
		const adminId = session?.user?.id;
		const adminName = session?.user?.name || "Admin";

		const id = formData.get("id") as string;
		const reason = formData.get("reason") as string | null;

		const result = cancelOrderSchema.safeParse({ id, reason });
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "ID invalide",
			};
		}

		// Récupérer la commande avec ses items pour la restauration du stock
		const order = await prisma.order.findUnique({
			where: { id },
			select: {
				id: true,
				orderNumber: true,
				status: true,
				paymentStatus: true,
				total: true,
				customerEmail: true,
				customerName: true,
				shippingFirstName: true,
				items: {
					select: {
						skuId: true,
						quantity: true,
					},
				},
			},
		});

		if (!order) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: ORDER_ERROR_MESSAGES.NOT_FOUND,
			};
		}

		// Vérifier si déjà annulée
		if (order.status === OrderStatus.CANCELLED) {
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.ALREADY_CANCELLED,
			};
		}

		// Déterminer le nouveau paymentStatus
		// Si la commande était payée, on passe à REFUNDED
		const newPaymentStatus =
			order.paymentStatus === PaymentStatus.PAID
				? PaymentStatus.REFUNDED
				: order.paymentStatus;

		// 🔴 CORRECTION : Ne restaurer le stock QUE si la commande était PENDING
		// - PENDING = stock réservé lors du checkout, doit être libéré
		// - PAID = produit déjà envoyé/reçu par le client, stock ne doit PAS être restauré
		// - FAILED/REFUNDED = stock déjà restauré par les webhooks
		const shouldRestoreStock = order.paymentStatus === PaymentStatus.PENDING;

		// Transaction pour annuler la commande ET restaurer le stock si nécessaire
		await prisma.$transaction(async (tx) => {
			// 1. Mettre à jour la commande
			await tx.order.update({
				where: { id },
				data: {
					status: OrderStatus.CANCELLED,
					paymentStatus: newPaymentStatus,
				},
			});

			// 2. Restaurer le stock uniquement si la commande était PENDING
			if (shouldRestoreStock) {
				for (const item of order.items) {
					await tx.productSku.update({
						where: { id: item.skuId },
						data: {
							inventory: {
								increment: item.quantity,
							},
						},
					});
				}
			}

			// 3. 🔴 AUDIT TRAIL (Best Practice Stripe 2025)
			await createOrderAuditTx(tx, {
				orderId: id,
				action: "CANCELLED",
				previousStatus: order.status,
				newStatus: OrderStatus.CANCELLED,
				previousPaymentStatus: order.paymentStatus,
				newPaymentStatus: newPaymentStatus,
				note: reason || undefined,
				authorId: adminId,
				authorName: adminName,
				source: "admin",
				metadata: {
					stockRestored: shouldRestoreStock,
					itemsCount: order.items.length,
				},
			});
		});

		revalidatePath("/admin/ventes/commandes");
		revalidatePath("/admin/catalogue/inventaire");

		// Envoyer l'email de confirmation d'annulation au client
		if (order.customerEmail) {
			const customerFirstName =
				order.customerName?.split(" ")[0] ||
				order.shippingFirstName ||
				"Client";

			const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000";
			const orderDetailsUrl = `${baseUrl}/compte/commandes/${order.orderNumber}`;

			await sendCancelOrderConfirmationEmail({
				to: order.customerEmail,
				orderNumber: order.orderNumber,
				customerName: customerFirstName,
				orderTotal: order.total,
				reason: reason || undefined,
				wasRefunded: newPaymentStatus === PaymentStatus.REFUNDED,
				orderDetailsUrl,
			});
		}

		const refundMessage =
			newPaymentStatus === PaymentStatus.REFUNDED
				? " Le statut de paiement a été passé à REFUNDED."
				: "";

		const stockMessage = shouldRestoreStock && order.items.length > 0
			? ` Stock restauré pour ${order.items.length} article(s).`
			: order.items.length > 0 && !shouldRestoreStock
				? " Stock non restauré (commande déjà payée/traitée)."
				: "";

		const emailMessage = order.customerEmail ? " Email envoyé au client." : "";

		return {
			status: ActionStatus.SUCCESS,
			message: `Commande ${order.orderNumber} annulée.${refundMessage}${stockMessage}${emailMessage}`,
		};
	} catch (error) {
		console.error("[CANCEL_ORDER]", error);
		return {
			status: ActionStatus.ERROR,
			message: ORDER_ERROR_MESSAGES.CANCEL_FAILED,
		};
	}
}
