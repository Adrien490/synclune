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

		// Fetch order and verify it hasn't been shipped yet
		const order = await prisma.order.findUnique({
			where: { id, deletedAt: null },
			select: {
				id: true,
				orderNumber: true,
				userId: true,
				fulfillmentStatus: true,
			},
		});

		if (!order) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: ORDER_ERROR_MESSAGES.NOT_FOUND,
			};
		}

		// Cannot update address after shipment
		if (order.fulfillmentStatus === "SHIPPED" || order.fulfillmentStatus === "DELIVERED" || order.fulfillmentStatus === "RETURNED") {
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.CANNOT_UPDATE_ADDRESS_SHIPPED,
			};
		}

		// Sanitize all text fields
		await prisma.order.update({
			where: { id },
			data: {
				shippingFirstName: sanitizeText(addressData.shippingFirstName),
				shippingLastName: sanitizeText(addressData.shippingLastName),
				shippingAddress1: sanitizeText(addressData.shippingAddress1),
				shippingAddress2: addressData.shippingAddress2
					? sanitizeText(addressData.shippingAddress2)
					: null,
				shippingPostalCode: sanitizeText(addressData.shippingPostalCode),
				shippingCity: sanitizeText(addressData.shippingCity),
				shippingCountry: addressData.shippingCountry,
			},
		});

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
