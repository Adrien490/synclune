"use server";

import { OrderStatus, FulfillmentStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logAudit } from "@/shared/lib/audit-log";
import {
	sendOrderConfirmationEmail,
	sendShippingConfirmationEmail,
	sendDeliveryConfirmationEmail,
} from "@/modules/emails/services/order-emails";
import { sendReviewRequestEmailInternal } from "@/modules/reviews/services/send-review-request-email.service";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { handleActionError, success, error } from "@/shared/lib/actions";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { getCarrierLabel, type Carrier } from "@/modules/orders/utils/carrier.utils";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
import { updateTag } from "next/cache";
import { z } from "zod";
import type { ResendEmailType } from "../types/email.types";
import { extractCustomerFirstName } from "../utils/customer-name";

// Re-export du type pour compatibilité
export type { ResendEmailType } from "../types/email.types";

/**
 * Server Action ADMIN pour renvoyér un email de commande
 */
export async function resendOrderEmail(
	orderId: string,
	emailType: ResendEmailType,
): Promise<ActionState> {
	try {
		// 1. Vérification admin
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.RESEND_EMAIL);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Validate orderId and emailType
		const idResult = z.cuid2().safeParse(orderId);
		if (!idResult.success) {
			return error("ID de commande invalide");
		}

		const emailTypeResult = z
			.enum(["confirmation", "shipping", "delivery", "review-request"])
			.safeParse(emailType);
		if (!emailTypeResult.success) {
			return error("Type d'email invalide");
		}

		// 4. Récupérer la commande avec uniquement les champs nécessaires
		const order = await prisma.order.findUnique({
			where: { id: orderId, ...notDeleted },
			select: {
				orderNumber: true,
				status: true,
				fulfillmentStatus: true,
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
				shippingCarrier: true,
				trackingNumber: true,
				trackingUrl: true,
				actualDelivery: true,
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
			return error("Commande non trouvée");
		}

		// 5. Vérifier que l'email peut être envoyé selon le type et l'envoyer
		let actionResult: ActionState;

		switch (emailType) {
			case "confirmation": {
				// Email de confirmation toujours possible
				const result = await sendOrderConfirmationEmail({
					to: order.customerEmail,
					orderNumber: order.orderNumber,
					customerName: extractCustomerFirstName(order.customerName, order.shippingFirstName),
					items: order.items,
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
					trackingUrl: buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(order.orderNumber)),
				});

				actionResult = result.success
					? success("Email de confirmation renvoyé")
					: error("Erreur lors de l'envoi de l'email de confirmation");
				break;
			}

			case "shipping": {
				// Vérifier que la commande a été expédiée
				if (order.status !== OrderStatus.SHIPPED && order.status !== OrderStatus.DELIVERED) {
					return error("La commande n'a pas encore été expédiée");
				}

				if (!order.trackingNumber) {
					return error("Aucun numéro de suivi disponible");
				}

				const carrierLabel = getCarrierLabel((order.shippingCarrier ?? "autre") as Carrier);

				const result = await sendShippingConfirmationEmail({
					to: order.customerEmail,
					orderNumber: order.orderNumber,
					customerName: extractCustomerFirstName(order.customerName, order.shippingFirstName),
					trackingNumber: order.trackingNumber,
					trackingUrl: order.trackingUrl,
					carrierLabel,
					shippingAddress: {
						firstName: order.shippingFirstName || "",
						lastName: order.shippingLastName || "",
						address1: order.shippingAddress1 || "",
						address2: order.shippingAddress2,
						postalCode: order.shippingPostalCode || "",
						city: order.shippingCity || "",
						country: order.shippingCountry || "France",
					},
				});

				actionResult = result.success
					? success("Email d'expedition renvoyé")
					: error("Erreur lors de l'envoi de l'email d'expedition");
				break;
			}

			case "delivery": {
				// Vérifier que la commande a été livrée
				if (
					order.status !== OrderStatus.DELIVERED &&
					order.fulfillmentStatus !== FulfillmentStatus.DELIVERED
				) {
					return error("La commande n'a pas encore été livrée");
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
					customerName: extractCustomerFirstName(order.customerName, order.shippingFirstName),
					deliveryDate,
					orderDetailsUrl: buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(order.orderNumber)),
				});

				actionResult = result.success
					? success("Email de livraison renvoyé")
					: error("Erreur lors de l'envoi de l'email de livraison");
				break;
			}

			case "review-request": {
				// Verifier que la commande a été livrée
				if (
					order.status !== OrderStatus.DELIVERED &&
					order.fulfillmentStatus !== FulfillmentStatus.DELIVERED
				) {
					return error("La commande n'a pas encore été livrée");
				}

				const reviewResult = await sendReviewRequestEmailInternal(orderId);

				actionResult =
					reviewResult.status === ActionStatus.SUCCESS
						? success("Email de demande d'avis renvoyé")
						: error(reviewResult.message || "Erreur lors de l'envoi de l'email de demande d'avis");
				break;
			}

			default:
				return error("Type d'email invalide");
		}

		if (actionResult.status === ActionStatus.SUCCESS) {
			updateTag(ORDERS_CACHE_TAGS.HISTORY(orderId));

			void logAudit({
				adminId: adminUser.id,
				adminName: adminUser.name ?? adminUser.email,
				action: "order.resendEmail",
				targetType: "order",
				targetId: orderId,
				metadata: { emailType, orderNumber: order.orderNumber },
			});
		}

		return actionResult;
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de l'envoi");
	}
}
