"use server";

import {
	OrderStatus,
	FulfillmentStatus,
} from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { sendTrackingUpdateEmail } from "@/modules/emails/services/order-emails";
import { logFailedEmail } from "@/modules/emails/services/log-failed-email";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { getCarrierLabel, getTrackingUrl, type Carrier } from "@/modules/orders/utils/carrier.utils";
import { updateTag } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderMetadataInvalidationTags } from "../constants/cache";
import { updateTrackingSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";

/**
 * Met à jour les informations de suivi d'une commande expédiée
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - La commande doit être expédiée (SHIPPED) ou livrée (DELIVERED)
 * - Met à jour le numéro de suivi, l'URL, le transporteur et la date de livraison estimée
 * - Envoie un email de mise à jour au client si sendEmail = true
 */
export async function updateTracking(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const id = formData.get("id") as string;
		const trackingNumber = formData.get("trackingNumber") as string;
		const trackingUrl = formData.get("trackingUrl") as string | null;
		const carrier = formData.get("carrier") as string | null;
		const estimatedDelivery = formData.get("estimatedDelivery") as string | null;
		const sendEmail = formData.get("sendEmail") as string | null;

		const validated = validateInput(updateTrackingSchema, {
			id,
			trackingNumber,
			trackingUrl: trackingUrl || undefined,
			carrier: carrier || undefined,
			estimatedDelivery: estimatedDelivery || undefined,
			sendEmail: sendEmail || "true",
		});
		if ("error" in validated) return validated.error;

		// Générer l'URL de suivi si non fournie
		const carrierValue = (validated.data.carrier || "autre") as Carrier;
		const finalTrackingUrl =
			validated.data.trackingUrl ||
			getTrackingUrl(carrierValue, validated.data.trackingNumber);

		// Transaction: fetch + validate status + update + audit atomically (prevents race condition)
		const order = await prisma.$transaction(async (tx) => {
			const found = await tx.order.findUnique({
				where: { id, ...notDeleted },
				select: {
					id: true,
					orderNumber: true,
					status: true,
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
					trackingNumber: true,
				},
			});

			if (!found) return null;

			if (found.status !== OrderStatus.SHIPPED && found.status !== OrderStatus.DELIVERED) {
				return { ...found, _error: "not_shipped" as const };
			}

			await tx.order.update({
				where: { id },
				data: {
					trackingNumber: validated.data.trackingNumber,
					trackingUrl: finalTrackingUrl,
					shippingCarrier: validated.data.carrier || null,
					estimatedDelivery: validated.data.estimatedDelivery,
				},
			});

			// Audit trail (Art. L123-22 Code de Commerce)
			await createOrderAuditTx(tx, {
				orderId: id,
				action: "TRACKING_UPDATED",
				note: `Suivi mis a jour : ${validated.data.trackingNumber}`,
				authorId: adminUser.id,
				authorName: adminUser.name || "Admin",
				metadata: {
					previousTrackingNumber: found.trackingNumber,
					newTrackingNumber: validated.data.trackingNumber,
					trackingUrl: finalTrackingUrl,
					carrier: validated.data.carrier || null,
				},
			});

			return found;
		});

		if (!order) {
			return error(ORDER_ERROR_MESSAGES.NOT_FOUND);
		}

		if ("_error" in order) {
			return error("Impossible de modifier le suivi : la commande n'est pas expediee.");
		}

		// Invalider les caches (orders list admin + commandes user)
		getOrderMetadataInvalidationTags(order.userId ?? undefined).forEach(tag => updateTag(tag));

		// Envoyer l'email de mise à jour du suivi au client
		let emailSent = false;
		if (validated.data.sendEmail && order.customerEmail) {
			const carrierLabel = getCarrierLabel(carrierValue);

			// Extraire le prénom du customerName ou utiliser shippingFirstName
			const customerFirstName =
				order.customerName?.split(" ")[0] ||
				order.shippingFirstName ||
				"Client";

			// Formater la date de livraison estimée
			const estimatedDeliveryStr = validated.data.estimatedDelivery
				? validated.data.estimatedDelivery.toLocaleDateString("fr-FR", {
						weekday: "long",
						year: "numeric",
						month: "long",
						day: "numeric",
				  })
				: "3-5 jours ouvres";

			try {
				await sendTrackingUpdateEmail({
					to: order.customerEmail,
					orderNumber: order.orderNumber,
					customerName: customerFirstName,
					trackingNumber: validated.data.trackingNumber,
					trackingUrl: finalTrackingUrl,
					carrierLabel,
					estimatedDelivery: estimatedDeliveryStr,
				});
				emailSent = true;
			} catch (emailError) {
				console.error("[UPDATE_TRACKING] Echec envoi email:", emailError);
				await logFailedEmail({
					to: order.customerEmail!,
					subject: `Suivi mis à jour — Commande ${order.orderNumber}`,
					template: "tracking-update",
					payload: {
						orderNumber: order.orderNumber,
						customerName: customerFirstName,
						trackingNumber: validated.data.trackingNumber,
						trackingUrl: finalTrackingUrl,
						carrierLabel,
						estimatedDelivery: estimatedDeliveryStr,
					},
					error: emailError,
					orderId: order.id,
				});
			}
		}

		// Si l'email devait être envoyé mais a échoué, retourner un warning
		if (validated.data.sendEmail && !emailSent) {
			return {
				status: ActionStatus.WARNING,
				message: `Suivi mis a jour. Nouveau numero : ${validated.data.trackingNumber}. ATTENTION: L'email n'a pas pu etre envoye au client.`,
			};
		}

		const emailMessage = emailSent ? " Email envoye au client." : "";
		return success(`Suivi mis a jour. Nouveau numero : ${validated.data.trackingNumber}.${emailMessage}`);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la mise a jour du suivi.");
	}
}
