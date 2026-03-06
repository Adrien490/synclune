"use server";

import { RefundStatus } from "@/app/generated/prisma/client";
import { requireAuth } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { RETURN_REQUEST_LIMIT } from "@/shared/lib/rate-limit-config";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { ActionStatus } from "@/shared/types/server-action";
import { sanitizeText } from "@/shared/lib/sanitize";
import { updateTag } from "next/cache";

import { REFUND_ERROR_MESSAGES } from "../constants/refund.constants";
import { ORDERS_CACHE_TAGS } from "../constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
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
	formData: FormData,
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
			message: formData.get("message") ?? undefined,
		});
		if ("error" in validated) return validated.error;

		const { orderId, reason, message } = validated.data;
		const sanitizedMessage = message ? sanitizeText(message) : null;

		// 4. Transaction atomique: vérification + création (FOR UPDATE)
		// Empêche les double-retours concurrents sur la même commande
		const result = await prisma.$transaction(async (tx) => {
			// Lock the order row to prevent concurrent return requests.
			// Including userId in the WHERE clause enforces IDOR protection at lock level.
			const orderRows = await tx.$queryRaw<{ id: string }[]>`
				SELECT id FROM "Order"
				WHERE id = ${orderId} AND "userId" = ${user.id} AND "deletedAt" IS NULL
				FOR UPDATE
			`;

			if (orderRows.length === 0) {
				throw new Error("ORDER_NOT_FOUND");
			}

			// Read order with items and refunds within the locked transaction
			const order = await tx.order.findUnique({
				where: { id: orderId, ...notDeleted },
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
								where: {
									refund: {
										status: {
											in: [RefundStatus.PENDING, RefundStatus.APPROVED, RefundStatus.COMPLETED],
										},
									},
								},
								select: { quantity: true },
							},
						},
					},
					refunds: {
						where: { status: { in: [RefundStatus.PENDING, RefundStatus.APPROVED] } },
						select: { id: true },
					},
				},
			});

			if (!order) {
				throw new Error("ORDER_NOT_FOUND");
			}

			// 5. Verify order is eligible for return
			if (order.paymentStatus !== "PAID" && order.paymentStatus !== "PARTIALLY_REFUNDED") {
				throw new Error("RETURN_NOT_ELIGIBLE");
			}

			if (order.fulfillmentStatus !== "DELIVERED") {
				throw new Error("RETURN_NOT_ELIGIBLE");
			}

			// 6. Check 14-day withdrawal deadline
			// Reject if actualDelivery is null (cannot calculate deadline)
			const deliveryDate = order.actualDelivery;
			if (!deliveryDate) {
				throw new Error("RETURN_NOT_ELIGIBLE");
			}

			const deadline = new Date(deliveryDate.getTime() + WITHDRAWAL_PERIOD_MS);
			if (new Date() > deadline) {
				throw new Error("RETURN_DEADLINE_EXCEEDED");
			}

			// 7. Check no existing PENDING or APPROVED refund for this order
			if (order.refunds.length > 0) {
				throw new Error("RETURN_ALREADY_REQUESTED");
			}

			// 8. Create refund for all items (full return request, admin decides final amount)
			const refundItems = order.items
				.filter((item) => {
					const alreadyRefunded = item.refundItems.reduce((sum, ri) => sum + ri.quantity, 0);
					return item.quantity - alreadyRefunded > 0;
				})
				.map((item) => {
					const alreadyRefunded = item.refundItems.reduce((sum, ri) => sum + ri.quantity, 0);
					const availableQuantity = item.quantity - alreadyRefunded;
					return {
						orderItemId: item.id,
						quantity: availableQuantity,
						amount: item.price * availableQuantity,
						restock: true,
					};
				});

			if (refundItems.length === 0) {
				throw new Error("RETURN_NOT_ELIGIBLE");
			}

			const totalAmount = refundItems.reduce((sum, item) => sum + item.amount, 0);

			const refund = await tx.refund.create({
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

			return { refund, userId: order.userId };
		});

		// 9. Invalidate caches
		updateTag(ORDERS_CACHE_TAGS.LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		updateTag(ORDERS_CACHE_TAGS.REFUNDS(orderId));
		updateTag(ORDERS_CACHE_TAGS.USER_ORDERS(result.userId!));
		updateTag(DASHBOARD_CACHE_TAGS.KPIS);
		updateTag(DASHBOARD_CACHE_TAGS.REVENUE_CHART);
		updateTag(DASHBOARD_CACHE_TAGS.RECENT_ORDERS);

		return success(
			"Votre demande de retour a été enregistrée. Nous la traiterons dans les plus brefs délais.",
			{ refundId: result.refund.id },
		);
	} catch (e) {
		// Handle business errors from the transaction
		if (e instanceof Error) {
			switch (e.message) {
				case "ORDER_NOT_FOUND":
					return {
						status: ActionStatus.NOT_FOUND,
						message: REFUND_ERROR_MESSAGES.ORDER_NOT_FOUND,
					};
				case "RETURN_NOT_ELIGIBLE":
					return error(REFUND_ERROR_MESSAGES.RETURN_NOT_ELIGIBLE);
				case "RETURN_DEADLINE_EXCEEDED":
					return error(REFUND_ERROR_MESSAGES.RETURN_DEADLINE_EXCEEDED);
				case "RETURN_ALREADY_REQUESTED":
					return error(REFUND_ERROR_MESSAGES.RETURN_ALREADY_REQUESTED);
			}
		}
		return handleActionError(e, REFUND_ERROR_MESSAGES.RETURN_REQUEST_FAILED);
	}
}
