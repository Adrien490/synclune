"use server";

import { OrderStatus, FulfillmentStatus } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import {
	sendOrderConfirmationEmail,
	sendShippingConfirmationEmail,
	sendDeliveryConfirmationEmail,
} from "@/shared/lib/email";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { getCarrierLabel, type Carrier } from "@/modules/orders/utils/carrier-detection";
import type { ResendEmailType } from "../types/email.types";

// Re-export du type pour compatibilité
export type { ResendEmailType } from "../types/email.types";

/**
 * Server Action ADMIN pour renvoyer un email de commande
 */
export async function resendOrderEmail(
	orderId: string,
	emailType: ResendEmailType
): Promise<ActionState> {
	try {
		// 1. Vérification admin
		const admin = await isAdmin();
		if (!admin) {
			return {
				status: ActionStatus.FORBIDDEN,
				message: "Accès réservé aux administrateurs",
			};
		}

		// 2. Récupérer la commande avec toutes les données nécessaires
		const order = await prisma.order.findUnique({
			where: { id: orderId },
			include: {
				items: {
					select: {
						productTitle: true,
						skuColor: true,
						skuMaterial: true,
						skuSize: true,
						quantity: true,
						price: true,
					},
				},
			},
		});

		if (!order) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Commande non trouvée",
			};
		}

		// 3. Vérifier que l'email peut être envoyé selon le type
		const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000";

		switch (emailType) {
			case "confirmation": {
				// Email de confirmation toujours possible
				const result = await sendOrderConfirmationEmail({
					to: order.customerEmail,
					orderNumber: order.orderNumber,
					customerName: order.customerName.split(" ")[0] || "Client",
					items: order.items,
					subtotal: order.subtotal,
					discount: order.discountAmount,
					shipping: order.shippingCost,
					tax: order.taxAmount,
					total: order.total,
					shippingAddress: {
						firstName: order.shippingFirstName,
						lastName: order.shippingLastName,
						address1: order.shippingAddress1,
						address2: order.shippingAddress2,
						postalCode: order.shippingPostalCode,
						city: order.shippingCity,
						country: order.shippingCountry,
					},
					trackingUrl: `${baseUrl}/mon-compte/commandes/${order.id}`,
					orderId: order.id,
				});

				if (!result.success) {
					return {
						status: ActionStatus.ERROR,
						message: "Erreur lors de l'envoi de l'email de confirmation",
					};
				}

				return {
					status: ActionStatus.SUCCESS,
					message: "Email de confirmation renvoyé",
				};
			}

			case "shipping": {
				// Vérifier que la commande a été expédiée
				if (order.status !== OrderStatus.SHIPPED && order.status !== OrderStatus.DELIVERED) {
					return {
						status: ActionStatus.ERROR,
						message: "La commande n'a pas encore été expédiée",
					};
				}

				if (!order.trackingNumber) {
					return {
						status: ActionStatus.ERROR,
						message: "Aucun numéro de suivi disponible",
					};
				}

				const carrierLabel = getCarrierLabel((order.shippingCarrier || "autre") as Carrier);

				const result = await sendShippingConfirmationEmail({
					to: order.customerEmail,
					orderNumber: order.orderNumber,
					customerName: order.customerName.split(" ")[0] || "Client",
					trackingNumber: order.trackingNumber,
					trackingUrl: order.trackingUrl,
					carrierLabel,
					shippingAddress: {
						firstName: order.shippingFirstName,
						lastName: order.shippingLastName,
						address1: order.shippingAddress1,
						address2: order.shippingAddress2,
						postalCode: order.shippingPostalCode,
						city: order.shippingCity,
						country: order.shippingCountry,
					},
					estimatedDelivery: "3-5 jours ouvrés",
				});

				if (!result.success) {
					return {
						status: ActionStatus.ERROR,
						message: "Erreur lors de l'envoi de l'email d'expédition",
					};
				}

				return {
					status: ActionStatus.SUCCESS,
					message: "Email d'expédition renvoyé",
				};
			}

			case "delivery": {
				// Vérifier que la commande a été livrée
				if (order.status !== OrderStatus.DELIVERED && order.fulfillmentStatus !== FulfillmentStatus.DELIVERED) {
					return {
						status: ActionStatus.ERROR,
						message: "La commande n'a pas encore été livrée",
					};
				}

				const deliveryDate = order.actualDelivery
					? new Date(order.actualDelivery).toLocaleDateString("fr-FR", {
							day: "numeric",
							month: "long",
							year: "numeric",
						})
					: new Date().toLocaleDateString("fr-FR", {
							day: "numeric",
							month: "long",
							year: "numeric",
						});

				const result = await sendDeliveryConfirmationEmail({
					to: order.customerEmail,
					orderNumber: order.orderNumber,
					customerName: order.customerName.split(" ")[0] || "Client",
					deliveryDate,
					orderDetailsUrl: `${baseUrl}/mon-compte/commandes/${order.id}`,
				});

				if (!result.success) {
					return {
						status: ActionStatus.ERROR,
						message: "Erreur lors de l'envoi de l'email de livraison",
					};
				}

				return {
					status: ActionStatus.SUCCESS,
					message: "Email de livraison renvoyé",
				};
			}

			default:
				return {
					status: ActionStatus.VALIDATION_ERROR,
					message: "Type d'email invalide",
				};
		}
	} catch (error) {
		console.error("[RESEND_ORDER_EMAIL] Erreur:", error);
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue lors de l'envoi",
		};
	}
}
