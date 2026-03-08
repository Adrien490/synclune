"use server";

import { OrderStatus, FulfillmentStatus, HistorySource } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { sendShippingConfirmationEmail } from "@/modules/emails/services/order-emails";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import {
	handleActionError,
	success,
	error,
	notFound,
	validationError,
	safeFormGet,
} from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import {
	getCarrierLabel,
	getTrackingUrl,
	type Carrier,
} from "@/modules/orders/utils/carrier.utils";
import { updateTag } from "next/cache";
import { logger } from "@/shared/lib/logger";

import { logAudit } from "@/shared/lib/audit-log";
import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
import { markAsShippedSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";
import { extractCustomerFirstName } from "../utils/customer-name";
import { canMarkAsShipped } from "../services/order-status-validation.service";

/**
 * Marque une commande comme expédiée
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - La commande doit être payée (PaymentStatus.PAID)
 * - La commande ne doit pas être annulée
 * - Requiert un numéro de suivi
 * - Passe OrderStatus à SHIPPED
 * - Passe FulfillmentStatus à SHIPPED
 * - Enregistre le numéro de suivi et la date d'expédition
 * - Envoie un email au client si sendEmail = true
 */
export async function markAsShipped(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const rawId = safeFormGet(formData, "id");
		const trackingNumber = safeFormGet(formData, "trackingNumber");
		const trackingUrl = safeFormGet(formData, "trackingUrl");
		const carrier = safeFormGet(formData, "carrier");
		const sendEmail = safeFormGet(formData, "sendEmail");

		const result = markAsShippedSchema.safeParse({
			id: rawId,
			trackingNumber,
			trackingUrl: trackingUrl ?? undefined,
			carrier: carrier ?? undefined,
			sendEmail: sendEmail ?? "true",
		});

		if (!result.success) {
			return validationError(result.error.issues[0]?.message ?? "Données invalides");
		}

		const { id } = result.data;

		// Générer l'URL de suivi si non fournie
		const carrierValue = (result.data.carrier ?? "autre") as Carrier;
		const finalTrackingUrl =
			result.data.trackingUrl ?? getTrackingUrl(carrierValue, result.data.trackingNumber);

		// Transaction: fetch + validate + update + audit atomically (prevents TOCTOU race)
		const order = await prisma.$transaction(async (tx) => {
			const found = await tx.order.findUnique({
				where: { id, ...notDeleted },
				select: {
					id: true,
					orderNumber: true,
					status: true,
					paymentStatus: true,
					fulfillmentStatus: true,
					userId: true,
					customerEmail: true,
					customerName: true,
					shippingFirstName: true,
					shippingLastName: true,
					shippingAddress1: true,
					shippingAddress2: true,
					shippingPostalCode: true,
					shippingCity: true,
					shippingCountry: true,
				},
			});

			if (!found) return null;

			// Validation métier via le service
			const shipValidation = canMarkAsShipped(found);
			if (!shipValidation.canShip) {
				return { ...found, _error: shipValidation.reason };
			}

			await tx.order.update({
				where: { id },
				data: {
					status: OrderStatus.SHIPPED,
					fulfillmentStatus: FulfillmentStatus.SHIPPED,
					trackingNumber: result.data.trackingNumber,
					trackingUrl: finalTrackingUrl,
					shippingCarrier: result.data.carrier ?? null,
					shippedAt: new Date(),
				},
			});

			await createOrderAuditTx(tx, {
				orderId: id,
				action: "SHIPPED",
				previousStatus: found.status,
				newStatus: OrderStatus.SHIPPED,
				previousFulfillmentStatus: found.fulfillmentStatus,
				newFulfillmentStatus: FulfillmentStatus.SHIPPED,
				authorId: adminUser.id,
				authorName: adminUser.name ?? "Admin",
				source: HistorySource.ADMIN,
				metadata: {
					trackingNumber: result.data.trackingNumber,
					trackingUrl: finalTrackingUrl,
					shippingCarrier: result.data.carrier,
					emailSent: result.data.sendEmail,
				},
			});

			return found;
		});

		if (!order) {
			return notFound("Commande");
		}

		if ("_error" in order) {
			const errorMessages: Record<string, string> = {
				already_shipped: ORDER_ERROR_MESSAGES.ALREADY_SHIPPED,
				cancelled: ORDER_ERROR_MESSAGES.CANNOT_SHIP_CANCELLED,
				unpaid: ORDER_ERROR_MESSAGES.CANNOT_SHIP_UNPAID,
			};
			return error(errorMessages[order._error] ?? ORDER_ERROR_MESSAGES.MARK_AS_SHIPPED_FAILED);
		}

		// Invalider les caches (orders list admin + commandes user)
		getOrderInvalidationTags(order.userId ?? undefined, order.id).forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "order.markShipped",
			targetType: "order",
			targetId: order.id,
			metadata: {
				orderNumber: order.orderNumber,
				previousStatus: order.status,
				trackingNumber: result.data.trackingNumber,
				carrier: result.data.carrier,
			},
		});

		// Envoyer l'email de confirmation d'expédition au client
		let emailSent = false;
		if (result.data.sendEmail && order.customerEmail) {
			const carrierLabel = getCarrierLabel(carrierValue);

			const customerFirstName = extractCustomerFirstName(
				order.customerName,
				order.shippingFirstName,
			);

			try {
				await sendShippingConfirmationEmail({
					to: order.customerEmail,
					orderNumber: order.orderNumber,
					customerName: customerFirstName,
					trackingNumber: result.data.trackingNumber,
					trackingUrl: finalTrackingUrl,
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
				emailSent = true;
			} catch (emailError) {
				logger.error("Échec envoi email", emailError, { action: "mark-as-shipped" });
			}
		}

		// Si l'email devait être envoyé mais a échoué, retourner un warning
		if (result.data.sendEmail && !emailSent) {
			return {
				status: ActionStatus.WARNING,
				message: `Commande ${order.orderNumber} expédiée. Numéro de suivi : ${result.data.trackingNumber}. ATTENTION: L'email n'a pas pu être envoyé au client.`,
			};
		}

		const emailMessage = emailSent ? " Email envoyé au client." : "";
		return success(
			`Commande ${order.orderNumber} expédiée. Numéro de suivi : ${result.data.trackingNumber}.${emailMessage}`,
		);
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.MARK_AS_SHIPPED_FAILED);
	}
}
