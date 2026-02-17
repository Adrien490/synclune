"use server";

import {
	OrderStatus,
	PaymentStatus,
	FulfillmentStatus,
	Prisma,
	HistorySource,
} from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { updateTag } from "next/cache";

import { sendOrderConfirmationEmail } from "@/modules/emails/services/order-emails";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
import { markAsPaidSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";
import { handleActionError } from "@/shared/lib/actions";

/**
 * Marque une commande comme payée manuellement
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - La commande doit être en statut PENDING
 * - Le paiement ne doit pas déjà être PAID
 * - Passe PaymentStatus à PAID
 * - Passe OrderStatus à PROCESSING
 * - Passe FulfillmentStatus à PROCESSING
 * - Enregistre la date de paiement
 */
export async function markAsPaid(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const id = formData.get("id") as string;
		const note = formData.get("note") as string | null;

		const result = markAsPaidSchema.safeParse({ id, note });
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "ID invalide",
			};
		}

		const order = await prisma.order.findUnique({
			where: { id },
			select: {
				id: true,
				orderNumber: true,
				status: true,
				paymentStatus: true,
				fulfillmentStatus: true,
				userId: true,
				customerEmail: true,
				customerName: true,
				subtotal: true,
				discountAmount: true,
				shippingCost: true,
				total: true,
				shippingFirstName: true,
				shippingLastName: true,
				shippingAddress1: true,
				shippingAddress2: true,
				shippingPostalCode: true,
				shippingCity: true,
				shippingCountry: true,
				stripeCheckoutSessionId: true, // Pour savoir si le stock a été réservé via checkout
				items: {
					select: {
						skuId: true,
						quantity: true,
						productTitle: true,
						skuColor: true,
						skuMaterial: true,
						skuSize: true,
						price: true,
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

		// Vérifier si déjà payée
		if (order.paymentStatus === PaymentStatus.PAID) {
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.ALREADY_PAID,
			};
		}

		// Vérifier si annulée
		if (order.status === OrderStatus.CANCELLED) {
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.CANNOT_PAY_CANCELLED,
			};
		}

		// 🔴 CORRECTION : Vérifier si le stock a été réservé
		// - Si stripeCheckoutSessionId existe → stock déjà réservé lors du checkout
		// - Si absent → commande créée manuellement, stock à décrémenter
		const stockAlreadyReserved = !!order.stripeCheckoutSessionId;

		// Transaction atomique pour mise à jour commande + gestion stock
		await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
			// Si le stock n'a pas été réservé (commande manuelle), le décrémenter maintenant
			if (!stockAlreadyReserved && order.items.length > 0) {
				// Vérifier d'abord que le stock est suffisant pour tous les items
				for (const item of order.items) {
					const sku = await tx.productSku.findUnique({
						where: { id: item.skuId },
						select: { inventory: true, sku: true, isActive: true },
					});

					if (!sku) {
						throw new Error(`SKU introuvable : ${item.skuId}`);
					}

					if (!sku.isActive) {
						throw new Error(`Le produit ${item.productTitle} n'est plus disponible (SKU inactif)`);
					}

					if (sku.inventory < item.quantity) {
						throw new Error(
							`Stock insuffisant pour ${item.productTitle} (${item.quantity} demandé, ${sku.inventory} disponible)`
						);
					}
				}

				// Décrémenter le stock
				for (const item of order.items) {
					await tx.productSku.update({
						where: { id: item.skuId },
						data: {
							inventory: { decrement: item.quantity },
						},
					});
				}
			}

			// Mettre à jour la commande
			await tx.order.update({
				where: { id },
				data: {
					paymentStatus: PaymentStatus.PAID,
					status: OrderStatus.PROCESSING,
					fulfillmentStatus: FulfillmentStatus.PROCESSING,
					paidAt: new Date(),
				},
			});

			// 🔴 AUDIT TRAIL (Best Practice Stripe 2025)
			await createOrderAuditTx(tx, {
				orderId: id,
				action: "PAID",
				previousStatus: order.status,
				newStatus: OrderStatus.PROCESSING,
				previousPaymentStatus: order.paymentStatus,
				newPaymentStatus: PaymentStatus.PAID,
				previousFulfillmentStatus: order.fulfillmentStatus,
				newFulfillmentStatus: FulfillmentStatus.PROCESSING,
				authorId: adminUser.id,
				authorName: adminUser.name || "Admin",
				source: HistorySource.ADMIN,
				metadata: {
					stockAdjusted: !stockAlreadyReserved,
					itemsCount: order.items.length,
				},
			});
		});

		// Invalider les caches (orders list admin + commandes user)
		getOrderInvalidationTags(order.userId ?? undefined).forEach(tag => updateTag(tag));

		// Send order confirmation email for manual payment
		if (order.customerEmail) {
			const trackingUrl = buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(order.orderNumber));
			sendOrderConfirmationEmail({
				to: order.customerEmail,
				orderNumber: order.orderNumber,
				customerName: order.customerName || "Client",
				items: order.items.map((item) => ({
					productTitle: item.productTitle,
					skuColor: item.skuColor,
					skuMaterial: item.skuMaterial,
					skuSize: item.skuSize,
					quantity: item.quantity,
					price: item.price,
				})),
				subtotal: order.subtotal,
				discount: order.discountAmount,
				shipping: order.shippingCost,
				total: order.total,
				shippingAddress: {
					firstName: order.shippingFirstName || "",
					lastName: order.shippingLastName || "",
					address1: order.shippingAddress1 || "",
					address2: order.shippingAddress2,
					postalCode: order.shippingPostalCode || "",
					city: order.shippingCity || "",
					country: order.shippingCountry || "France",
				},
				trackingUrl,
			}).catch(() => {});
		}

		const stockMessage = !stockAlreadyReserved && order.items.length > 0
			? ` Stock décrémenté pour ${order.items.length} article(s).`
			: "";

		return {
			status: ActionStatus.SUCCESS,
			message: `Commande ${order.orderNumber} marquée comme payée. Prête pour préparation.${stockMessage}`,
		};
	} catch (error) {
		return handleActionError(error, ORDER_ERROR_MESSAGES.MARK_AS_PAID_FAILED);
	}
}
