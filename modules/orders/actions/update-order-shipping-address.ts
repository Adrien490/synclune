"use server";

import { OrderStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { validateInput, handleActionError, safeFormGet } from "@/shared/lib/actions";
import { sanitizeText } from "@/shared/lib/sanitize";
import { updateTag } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderMetadataInvalidationTags } from "../constants/cache";
import { updateOrderShippingAddressSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";

/**
 * Updates the shipping address of an order before shipment
 * Admin only - used to correct address errors before dispatch
 *
 * Business rules:
 * - Order must not already be shipped or delivered
 * - Only pre-shipment orders can have their address corrected
 */
export async function updateOrderShippingAddress(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const rawData = {
			id: safeFormGet(formData, "id"),
			shippingFirstName: safeFormGet(formData, "shippingFirstName"),
			shippingLastName: safeFormGet(formData, "shippingLastName"),
			shippingAddress1: safeFormGet(formData, "shippingAddress1"),
			shippingAddress2: safeFormGet(formData, "shippingAddress2") ?? undefined,
			shippingPostalCode: safeFormGet(formData, "shippingPostalCode"),
			shippingCity: safeFormGet(formData, "shippingCity"),
			shippingCountry: safeFormGet(formData, "shippingCountry") ?? "FR",
			shippingPhone: safeFormGet(formData, "shippingPhone") ?? undefined,
		};

		const validated = validateInput(updateOrderShippingAddressSchema, rawData);
		if ("error" in validated) return validated.error;

		const { id, ...addressData } = validated.data;

		// Transaction: fetch + validate + update + audit atomically
		const order = await prisma.$transaction(async (tx) => {
			const found = await tx.order.findUnique({
				where: { id, ...notDeleted },
				select: {
					id: true,
					orderNumber: true,
					// Portait `fulfillmentStatus` jusqu'au Lot 4 : la garde « pas après
					// expédition » lit désormais l'axe unique.
					status: true,
					shippingFirstName: true,
					shippingLastName: true,
					shippingAddress1: true,
					shippingAddress2: true,
					shippingPostalCode: true,
					shippingCity: true,
					shippingCountry: true,
					shippingPhone: true,
				},
			});

			if (!found) return null;

			// Cannot update address after shipment. Lu sur `status` depuis le Lot 4 —
			// mêmes trois valeurs, un seul axe.
			if (
				found.status === OrderStatus.SHIPPED ||
				found.status === OrderStatus.DELIVERED ||
				found.status === OrderStatus.RETURNED
			) {
				return { ...found, _error: "already_shipped" as const };
			}

			const sanitizedData = {
				shippingFirstName: sanitizeText(addressData.shippingFirstName),
				shippingLastName: sanitizeText(addressData.shippingLastName),
				shippingAddress1: sanitizeText(addressData.shippingAddress1),
				shippingAddress2: addressData.shippingAddress2
					? sanitizeText(addressData.shippingAddress2)
					: null,
				shippingPostalCode: sanitizeText(addressData.shippingPostalCode),
				shippingCity: sanitizeText(addressData.shippingCity),
				shippingCountry: addressData.shippingCountry,
				// `shippingPhone` est NOT NULL en base : un champ vidé revient à la
				// chaîne vide, jamais à NULL (le schéma Zod accepte `""`).
				shippingPhone: addressData.shippingPhone ? sanitizeText(addressData.shippingPhone) : "",
			};

			await tx.order.update({
				where: { id },
				data: sanitizedData,
			});

			// Audit trail (Art. L123-22 Code de Commerce). `addressType: "shipping"`
			// est conservé bien qu'il n'existe plus qu'un seul type d'adresse depuis
			// le retrait des colonnes `billing*` (2026-08-04) : les entrées d'audit
			// déjà écrites le portent, et un filtre par type doit continuer de les
			// retrouver — la table est immuable pendant 10 ans.
			// ⚠️ RGPD (audit rétention 10 ans 2026-07-09) : ne JAMAIS écrire de
			// valeurs d'adresse dans OrderHistory.metadata — la table est immuable
			// 10 ans, jamais scrubée à l'anonymisation ni à la purge. `changedFields`
			// trace qui/quand/quels champs (suffisant pour L123-22) ; les valeurs
			// probantes vivent sur le snapshot Order et la facture figée.
			await createOrderAuditTx(tx, {
				orderId: id,
				action: "ADDRESS_UPDATED",
				authorName: auth.user.name ?? "Admin",
				note: "Adresse de livraison modifiee",
				metadata: {
					addressType: "shipping",
					changedFields: Object.keys(sanitizedData),
				},
			});

			return found;
		});

		if (!order) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: ORDER_ERROR_MESSAGES.NOT_FOUND,
			};
		}

		if ("_error" in order) {
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.CANNOT_UPDATE_ADDRESS_SHIPPED,
			};
		}

		// Invalidate caches
		getOrderMetadataInvalidationTags(order.id).forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: `Adresse de livraison mise à jour pour la commande ${order.orderNumber}.`,
		};
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.UPDATE_SHIPPING_ADDRESS_FAILED);
	}
}
