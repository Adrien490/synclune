"use server";

import { OrderStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { sendTrackingUpdateEmail } from "@/modules/emails/services/order-emails";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import {
	validateInput,
	handleActionError,
	success,
	error,
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
import { getOrderMetadataInvalidationTags } from "../constants/cache";
import { updateTrackingSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";
import { extractCustomerFirstName } from "../utils/customer-name";

/**
 * Met à jour les informations de suivi d'une commande expédiée
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - La commande doit être expédiée (SHIPPED) ou livrée (DELIVERED)
 * - Met à jour le numéro de suivi, l'URL et le transporteur
 * - Envoie un email de mise à jour au client si sendEmail = true
 */
export async function updateTracking(
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

		const validated = validateInput(updateTrackingSchema, {
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
					actualDelivery: true,
				},
			});

			if (!found) return null;

			if (found.status !== OrderStatus.SHIPPED && found.status !== OrderStatus.DELIVERED) {
				return { ...found, _error: "not_shipped" as const };
			}

			// ORD-BIZ-006 : refuse la modification du tracking au-delà de 30 jours
			// après livraison. Au-delà, la preuve de livraison est stabilisée
			// (litige client / réclamation transporteur prescrits sous ce délai).
			// Modifier après = risque d'altération de preuve.
			if (found.status === OrderStatus.DELIVERED && found.actualDelivery) {
				const daysSinceDelivery =
					(Date.now() - found.actualDelivery.getTime()) / (1000 * 60 * 60 * 24);
				if (daysSinceDelivery > 30) {
					return { ...found, _error: "tracking_lock_window" as const };
				}
			}

			await tx.order.update({
				where: { id },
				data: {
					trackingNumber: validated.data.trackingNumber,
					trackingUrl: finalTrackingUrl,
					shippingCarrier: validated.data.carrier ?? null,
				},
			});

			// Audit trail (Art. L123-22 Code de Commerce)
			await createOrderAuditTx(tx, {
				orderId: id,
				action: "TRACKING_UPDATED",
				note: `Suivi mis à jour : ${validated.data.trackingNumber}`,
				authorId: adminUser.id,
				authorName: adminUser.name ?? "Admin",
				metadata: {
					previousTrackingNumber: found.trackingNumber,
					newTrackingNumber: validated.data.trackingNumber,
					trackingUrl: finalTrackingUrl,
					carrier: validated.data.carrier ?? null,
				},
			});

			return found;
		});

		if (!order) {
			return error(ORDER_ERROR_MESSAGES.NOT_FOUND);
		}

		if ("_error" in order) {
			const message =
				order._error === "tracking_lock_window"
					? "Impossible de modifier le suivi : la commande a été livrée il y a plus de 30 jours (préservation de la preuve de livraison)."
					: "Impossible de modifier le suivi : la commande n'est pas expédiée.";
			return error(message);
		}

		// Invalider les caches (orders list admin + commandes user)
		getOrderMetadataInvalidationTags(order.userId ?? undefined, order.id).forEach((tag) =>
			updateTag(tag),
		);

		// Correction tracking post-livraison : ne pas notifier le client (colis déjà
		// chez lui, l'email "nouveau numéro de suivi" serait trompeur). On garde
		// l'audit trail mais on neutralise le sendEmail demandé par l'UI.
		const shouldSuppressEmail = order.status === OrderStatus.DELIVERED;
		const effectiveSendEmail = validated.data.sendEmail && !shouldSuppressEmail;

		// Envoyer l'email de mise à jour du suivi au client
		let emailSent = false;
		if (effectiveSendEmail && order.customerEmail) {
			const carrierLabel = getCarrierLabel(carrierValue);

			const customerFirstName = extractCustomerFirstName(
				order.customerName,
				order.shippingFirstName,
			);

			try {
				await sendTrackingUpdateEmail({
					to: order.customerEmail,
					orderNumber: order.orderNumber,
					customerName: customerFirstName,
					trackingNumber: validated.data.trackingNumber,
					trackingUrl: finalTrackingUrl,
					carrierLabel,
					// EMAIL-AUDIT-003 : dedup Resend 24h. La clé varie par trackingNumber
					// pour qu'un changement de transporteur émette bien un nouveau mail.
					idempotencyKey: `tracking-update:${order.id}:${validated.data.trackingNumber}`,
				});
				emailSent = true;
			} catch (emailError) {
				logger.error("Echec envoi email", emailError, { action: "update-tracking" });
			}
		}

		// Si l'email devait être envoyé mais a échoué, retourner un warning
		// (n'applique pas quand on a délibérément supprimé l'envoi post-livraison).
		if (effectiveSendEmail && !emailSent) {
			return {
				status: ActionStatus.WARNING,
				message: `Suivi mis à jour. Nouveau numéro : ${validated.data.trackingNumber}. ATTENTION: L'email n'a pas pu être envoyé au client.`,
			};
		}

		const emailMessage = emailSent
			? " Email envoyé au client."
			: shouldSuppressEmail && validated.data.sendEmail
				? " Email non envoyé (commande déjà livrée)."
				: "";
		return success(
			`Suivi mis à jour. Nouveau numéro : ${validated.data.trackingNumber}.${emailMessage}`,
		);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la mise à jour du suivi.");
	}
}
