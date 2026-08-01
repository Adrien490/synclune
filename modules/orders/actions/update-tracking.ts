"use server";

import { OrderStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import {
	validateInput,
	handleActionError,
	success,
	error,
	safeFormGet,
} from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { getTrackingUrl, type Carrier } from "@/modules/orders/utils/carrier.utils";
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
 * - Met à jour le numéro de suivi, l'URL et le transporteur
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

		const validated = validateInput(updateTrackingSchema, {
			id: rawId,
			trackingNumber,
			trackingUrl: trackingUrl ?? undefined,
			carrier: carrier ?? undefined,
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

			// Garde atomique : le `where` ré-asserte le statut attendu (miroir du
			// contrôle ci-dessus). count===0 ⇒ un writer concurrent a changé l'état
			// entre le findUnique et l'update — le findUnique ne verrouille pas la
			// ligne en read-committed, la transaction seule ne suffit pas. Sans elle,
			// un `revertToProcessing` concurrent nullait les champs de suivi et cette
			// action les repeuplait aussitôt sur une commande revenue en PROCESSING
			// (la garde ORD-BIZ-006 des 30 jours subissait la même course).
			// Aligné sur les 5 autres writers de fulfillment.
			const updated = await tx.order.updateMany({
				where: {
					id,
					...notDeleted,
					status: { in: [OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
				},
				data: {
					trackingNumber: validated.data.trackingNumber,
					trackingUrl: finalTrackingUrl,
					shippingCarrier: validated.data.carrier ?? null,
				},
			});
			if (updated.count === 0) {
				return { ...found, _error: "concurrent_change" as const };
			}

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
			const NOT_SHIPPED = "Impossible de modifier le suivi : la commande n'est pas expédiée.";
			const messages: Record<string, string> = {
				tracking_lock_window:
					"Impossible de modifier le suivi : la commande a été livrée il y a plus de 30 jours (préservation de la preuve de livraison).",
				concurrent_change: ORDER_ERROR_MESSAGES.CONCURRENT_CHANGE,
				not_shipped: NOT_SHIPPED,
			};
			return error(messages[order._error] ?? NOT_SHIPPED);
		}

		// Invalider les caches (orders list admin + commandes user)
		getOrderMetadataInvalidationTags(order.id).forEach((tag) => updateTag(tag));

		return success(`Suivi mis à jour. Nouveau numéro : ${validated.data.trackingNumber}.`);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la mise à jour du suivi.");
	}
}
