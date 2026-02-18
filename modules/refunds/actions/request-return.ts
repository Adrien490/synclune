"use server";

import { requireAuth } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { RETURN_REQUEST_LIMIT } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { ActionStatus } from "@/shared/types/server-action";
import { sanitizeText } from "@/shared/lib/sanitize";
import { updateTag } from "next/cache";

import { REFUND_ERROR_MESSAGES } from "../constants/refund.constants";
import { ORDERS_CACHE_TAGS } from "../constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { requestReturnSchema } from "../schemas/refund.schemas";

/** 14-day withdrawal period in milliseconds (directive 2011/83/EU) */
const WITHDRAWAL_PERIOD_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Client-side return request (droit de retractation 14 jours)
 *
 * Legal requirement: French consumers have a 14-day withdrawal right
 * from delivery date (directive 2011/83/EU, art. L221-18 Code de la consommation).
 *
 * Creates a Refund with status PENDING for admin review.
 * Admin can then approve/reject/process the refund.
 */
export async function requestReturn(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Auth check (customer, not admin)
		const auth = await requireAuth();
		if ("error" in auth) return auth.error;

		const { user } = auth;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(RETURN_REQUEST_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Validate input
		const validated = validateInput(requestReturnSchema, {
			orderId: formData.get("orderId"),
			reason: formData.get("reason"),
			message: formData.get("message") || undefined,
		});
		if ("error" in validated) return validated.error;

		const { orderId, reason, message } = validated.data;
		const sanitizedMessage = message ? sanitizeText(message) : null;

		// 4. Fetch the order and verify ownership (IDOR protection)
		const order = await prisma.order.findUnique({
			where: { id: orderId, deletedAt: null },
			select: {
				id: true,
				orderNumber: true,
				userId: true,
				paymentStatus: true,
				fulfillmentStatus: true,
				actualDelivery: true,
				total: true,
				items: {
					select: {
						id: true,
						quantity: true,
						price: true,
						refundItems: {
							select: { quantity: true },
						},
					},
				},
				refunds: {
					where: { status: "PENDING" },
					select: { id: true },
				},
			},
		});

		if (!order) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: REFUND_ERROR_MESSAGES.ORDER_NOT_FOUND,
			};
		}

		// Verify the order belongs to the requesting user
		if (order.userId !== user.id) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: REFUND_ERROR_MESSAGES.ORDER_NOT_FOUND,
			};
		}

		// 5. Verify order is eligible for return
		if (order.paymentStatus !== "PAID" && order.paymentStatus !== "PARTIALLY_REFUNDED") {
			return error(REFUND_ERROR_MESSAGES.RETURN_NOT_ELIGIBLE);
		}

		if (order.fulfillmentStatus !== "DELIVERED") {
			return error(REFUND_ERROR_MESSAGES.RETURN_NOT_ELIGIBLE);
		}

		// 6. Check 14-day withdrawal deadline
		const deliveryDate = order.actualDelivery;
		if (deliveryDate) {
			const deadline = new Date(deliveryDate.getTime() + WITHDRAWAL_PERIOD_MS);
			if (new Date() > deadline) {
				return error(REFUND_ERROR_MESSAGES.RETURN_DEADLINE_EXCEEDED);
			}
		}

		// 7. Check no existing PENDING refund for this order
		if (order.refunds.length > 0) {
			return error(REFUND_ERROR_MESSAGES.RETURN_ALREADY_REQUESTED);
		}

		// 8. Create refund for all items (full return request, admin decides final amount)
		const refundItems = order.items
			.filter((item) => {
				const alreadyRefunded = item.refundItems.reduce(
					(sum, ri) => sum + ri.quantity,
					0
				);
				return item.quantity - alreadyRefunded > 0;
			})
			.map((item) => {
				const alreadyRefunded = item.refundItems.reduce(
					(sum, ri) => sum + ri.quantity,
					0
				);
				const availableQuantity = item.quantity - alreadyRefunded;
				return {
					orderItemId: item.id,
					quantity: availableQuantity,
					amount: item.price * availableQuantity,
					restock: true,
				};
			});

		if (refundItems.length === 0) {
			return error(REFUND_ERROR_MESSAGES.RETURN_NOT_ELIGIBLE);
		}

		const totalAmount = refundItems.reduce((sum, item) => sum + item.amount, 0);

		const refund = await prisma.refund.create({
			data: {
				orderId,
				amount: totalAmount,
				reason,
				note: sanitizedMessage,
				createdBy: user.id,
				items: {
					create: refundItems,
				},
			},
			select: { id: true },
		});

		// 9. Invalidate caches
		updateTag(ORDERS_CACHE_TAGS.LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		updateTag(ORDERS_CACHE_TAGS.REFUNDS(orderId));
		updateTag(ORDERS_CACHE_TAGS.USER_ORDERS(user.id));

		return success(
			"Votre demande de retour a été enregistrée. Nous la traiterons dans les plus brefs délais.",
			{ refundId: refund.id }
		);
	} catch (e) {
		return handleActionError(e, REFUND_ERROR_MESSAGES.RETURN_REQUEST_FAILED);
	}
}
