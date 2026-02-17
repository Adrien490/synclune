"use server";

import { OrderStatus, FulfillmentStatus } from "@/app/generated/prisma/client";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import {
	sendOrderConfirmationEmail,
	sendShippingConfirmationEmail,
	sendDeliveryConfirmationEmail,
} from "@/modules/emails/services/order-emails";
import { sendReviewRequestEmailInternal } from "@/modules/reviews/actions/send-review-request-email";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { handleActionError, success, error } from "@/shared/lib/actions";
import { getCarrierLabel, type Carrier } from "@/modules/orders/utils/carrier.utils";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
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
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

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
			return error("Commande non trouvee");
		}

		// 3. Vérifier que l'email peut être envoyé selon le type

		switch (emailType) {
			case "confirmation": {
				// Email de confirmation toujours possible
				const result = await sendOrderConfirmationEmail({
					to: order.customerEmail,
					orderNumber: order.orderNumber,
					customerName: (order.customerName ?? "").split(" ")[0] || "Client",
					items: order.items,
					subtotal: order.subtotal,
					discount: order.discountAmount,
					shipping: order.shippingCost,
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
					trackingUrl: buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(order.id)),
				});

				if (!result.success) {
					return error("Erreur lors de l'envoi de l'email de confirmation");
				}

				return success("Email de confirmation renvoye");
			}

			case "shipping": {
				// Vérifier que la commande a été expédiée
				if (order.status !== OrderStatus.SHIPPED && order.status !== OrderStatus.DELIVERED) {
					return error("La commande n'a pas encore ete expediee");
				}

				if (!order.trackingNumber) {
					return error("Aucun numero de suivi disponible");
				}

				const carrierLabel = getCarrierLabel((order.shippingCarrier || "autre") as Carrier);

				const result = await sendShippingConfirmationEmail({
					to: order.customerEmail,
					orderNumber: order.orderNumber,
					customerName: (order.customerName ?? "").split(" ")[0] || "Client",
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
					estimatedDelivery: "3-5 jours ouvres",
				});

				if (!result.success) {
					return error("Erreur lors de l'envoi de l'email d'expedition");
				}

				return success("Email d'expedition renvoye");
			}

			case "delivery": {
				// Vérifier que la commande a été livrée
				if (order.status !== OrderStatus.DELIVERED && order.fulfillmentStatus !== FulfillmentStatus.DELIVERED) {
					return error("La commande n'a pas encore ete livree");
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
					customerName: (order.customerName ?? "").split(" ")[0] || "Client",
					deliveryDate,
					orderDetailsUrl: buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(order.id)),
				});

				if (!result.success) {
					return error("Erreur lors de l'envoi de l'email de livraison");
				}

				return success("Email de livraison renvoye");
			}

			case "review-request": {
				// Verifier que la commande a ete livree
				if (order.status !== OrderStatus.DELIVERED && order.fulfillmentStatus !== FulfillmentStatus.DELIVERED) {
					return error("La commande n'a pas encore ete livree");
				}

				const reviewResult = await sendReviewRequestEmailInternal(orderId);

				if (reviewResult.status !== ActionStatus.SUCCESS) {
					return error(reviewResult.message || "Erreur lors de l'envoi de l'email de demande d'avis");
				}

				return success("Email de demande d'avis renvoye");
			}

			default:
				return error("Type d'email invalide");
		}
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de l'envoi");
	}
}
