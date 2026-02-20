"use server";

import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { handleActionError } from "@/shared/lib/actions";
import { sanitizeText } from "@/shared/lib/sanitize";
import { updateTag } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
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
	formData: FormData
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const rawData = {
			id: formData.get("id") as string,
			shippingFirstName: formData.get("shippingFirstName") as string,
			shippingLastName: formData.get("shippingLastName") as string,
			shippingAddress1: formData.get("shippingAddress1") as string,
			shippingAddress2: (formData.get("shippingAddress2") as string) || undefined,
			shippingPostalCode: formData.get("shippingPostalCode") as string,
			shippingCity: formData.get("shippingCity") as string,
			shippingCountry: (formData.get("shippingCountry") as string) || "FR",
		};

		const result = updateOrderShippingAddressSchema.safeParse(rawData);
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "Données invalides",
			};
		}

		const { id, ...addressData } = result.data;

		// Transaction: fetch + validate + update + audit atomically
		const order = await prisma.$transaction(async (tx) => {
			const found = await tx.order.findUnique({
				where: { id, deletedAt: null },
				select: {
					id: true,
					orderNumber: true,
					userId: true,
					fulfillmentStatus: true,
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

			// Cannot update address after shipment
			if (found.fulfillmentStatus === "SHIPPED" || found.fulfillmentStatus === "DELIVERED" || found.fulfillmentStatus === "RETURNED") {
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
			};

			await tx.order.update({
				where: { id },
				data: sanitizedData,
			});

			// Audit trail (Art. L123-22 Code de Commerce)
			await createOrderAuditTx(tx, {
				orderId: id,
				action: "ADDRESS_UPDATED",
				authorId: auth.user.id,
				authorName: auth.user.name || "Admin",
				note: "Adresse de livraison modifiee",
				metadata: {
					previousAddress: {
						firstName: found.shippingFirstName,
						lastName: found.shippingLastName,
						address1: found.shippingAddress1,
						address2: found.shippingAddress2,
						postalCode: found.shippingPostalCode,
						city: found.shippingCity,
						country: found.shippingCountry,
					},
					newAddress: sanitizedData,
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
		getOrderInvalidationTags(order.userId ?? undefined).forEach(tag => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: `Adresse de livraison mise à jour pour la commande ${order.orderNumber}.`,
		};
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.UPDATE_SHIPPING_ADDRESS_FAILED);
	}
}
