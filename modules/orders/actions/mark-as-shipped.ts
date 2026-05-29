"use server";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { OrderStatus, FulfillmentStatus, HistorySource } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { sendShippingConfirmationEmail } from "@/modules/emails/services/order-emails";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import {
	validateInput,
	handleActionError,
	success,
	error,
	notFound,
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

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
import { markAsShippedSchema } from "../schemas/order.schemas";
import { createOrderAudit, createOrderAuditTx } from "../utils/order-audit";
import { extractCustomerFirstName } from "../utils/customer-name";
import { canMarkAsShipped } from "../services/order-status-validation.service";
import { estimateDeliveryDate } from "../services/shipping.service";

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

		const validated = validateInput(markAsShippedSchema, {
			id: rawId,
			trackingNumber,
			trackingUrl: trackingUrl ?? undefined,
			carrier: carrier ?? undefined,
			sendEmail: sendEmail ?? "true",
		});
		if ("error" in validated) return validated.error;

		const { id } = validated.data;

		// Générer l'URL de suivi si non fournie
		const carrierValue = (validated.data.carrier ?? "autre") as Carrier;
		const finalTrackingUrl =
			validated.data.trackingUrl ?? getTrackingUrl(carrierValue, validated.data.trackingNumber);

		// Date estimée de livraison, calculée dans la transaction (dépend du pays)
		// puis réutilisée pour l'email de confirmation post-commit.
		let estimatedDeliveryForEmail: Date | undefined;

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

			// Date estimée de livraison = expédition + borne haute du délai transport
			// (jours ouvrés) selon la zone de destination.
			const shippedAt = new Date();
			const estimatedDelivery = estimateDeliveryDate(shippedAt, found.shippingCountry);

			await tx.order.update({
				where: { id },
				data: {
					status: OrderStatus.SHIPPED,
					fulfillmentStatus: FulfillmentStatus.SHIPPED,
					trackingNumber: validated.data.trackingNumber,
					trackingUrl: finalTrackingUrl,
					shippingCarrier: validated.data.carrier ?? null,
					shippedAt,
					estimatedDelivery,
				},
			});

			// Remonté hors transaction pour l'email de confirmation (cf. plus bas).
			estimatedDeliveryForEmail = estimatedDelivery;

			// ORD-BIZ-012 : `emailRequested` capture l'intention admin (case cochée
			// dans le dialog). Le résultat réel de l'envoi (post-commit) est tracé
			// via une 2e entrée OrderHistory si l'email échoue (voir post-commit).
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
					trackingNumber: validated.data.trackingNumber,
					trackingUrl: finalTrackingUrl,
					shippingCarrier: validated.data.carrier,
					emailRequested: validated.data.sendEmail,
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
				not_processing: ORDER_ERROR_MESSAGES.CANNOT_SHIP_NOT_PROCESSING,
			};
			return error(errorMessages[order._error] ?? ORDER_ERROR_MESSAGES.MARK_AS_SHIPPED_FAILED);
		}

		// Invalider les caches (orders list admin + commandes user)
		getOrderInvalidationTags(order.userId ?? undefined, order.id).forEach((tag) => updateTag(tag));

		// Envoyer l'email de confirmation d'expédition au client
		let emailSent = false;
		if (validated.data.sendEmail && order.customerEmail) {
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
					trackingNumber: validated.data.trackingNumber,
					trackingUrl: finalTrackingUrl,
					carrierLabel,
					estimatedDelivery: estimatedDeliveryForEmail
						? format(estimatedDeliveryForEmail, "d MMMM yyyy", { locale: fr })
						: null,
					shippingAddress: {
						firstName: order.shippingFirstName || "",
						lastName: order.shippingLastName || "",
						address1: order.shippingAddress1 || "",
						address2: order.shippingAddress2,
						postalCode: order.shippingPostalCode || "",
						city: order.shippingCity || "",
						country: order.shippingCountry || "France",
					},
					// EMAIL-AUDIT-003 : dedup Resend 24h contre double-clic admin.
					idempotencyKey: `order-shipped:${order.id}`,
				});
				emailSent = true;
			} catch (emailError) {
				logger.error("Échec envoi email", emailError, { action: "mark-as-shipped" });
			}
		}

		// ORD-BIZ-012 : trace post-commit du résultat réel de l'envoi email
		// (si demandé) pour distinguer l'intention (audit initial) du fait.
		if (validated.data.sendEmail && !emailSent && order.customerEmail) {
			await createOrderAudit({
				orderId: order.id,
				action: "SHIPPED",
				note: "Email de confirmation d'expédition non envoyé (échec Resend ou client sans email)",
				authorId: adminUser.id,
				authorName: adminUser.name ?? "Admin",
				source: HistorySource.SYSTEM,
				metadata: { emailDeliveryFailed: true, postCommit: true },
			});
		}

		// Si l'email devait être envoyé mais a échoué, retourner un warning
		if (validated.data.sendEmail && !emailSent) {
			return {
				status: ActionStatus.WARNING,
				message: `Commande ${order.orderNumber} expédiée. Numéro de suivi : ${validated.data.trackingNumber}. ATTENTION: L'email n'a pas pu être envoyé au client.`,
			};
		}

		const emailMessage = emailSent ? " Email envoyé au client." : "";
		return success(
			`Commande ${order.orderNumber} expédiée. Numéro de suivi : ${validated.data.trackingNumber}.${emailMessage}`,
		);
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.MARK_AS_SHIPPED_FAILED);
	}
}
