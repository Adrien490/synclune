"use server";

import { OrderStatus, PaymentStatus, HistorySource } from "@/app/generated/prisma/client";
import { requireAuth } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ORDER_CANCEL_LIMIT } from "@/shared/lib/rate-limit-config";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { sendCancelOrderConfirmationEmail } from "@/modules/emails/services/status-emails";
import type { ActionState } from "@/shared/types/server-action";
import { handleActionError, success, error, validateInput } from "@/shared/lib/actions";
import { updateTag } from "next/cache";
import { z } from "zod";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
import { createOrderAuditTx } from "../utils/order-audit";
import { buildUrl, ROUTES } from "@/shared/constants/urls";

const cancelOrderCustomerSchema = z.object({
	id: z.cuid2(),
});

/**
 * Customer-facing order cancellation
 *
 * Rules:
 * - Only the order owner can cancel (IDOR protection)
 * - Only PENDING orders can be cancelled (not PROCESSING, SHIPPED, etc.)
 * - Stock is restored (no physical fulfillment has started)
 * - PaymentStatus is set to REFUNDED if it was PAID
 * - Audit trail with CUSTOMER source
 * - Cancellation email sent to customer
 */
export async function cancelOrderCustomer(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const auth = await requireAuth();
		if ("error" in auth) return auth.error;
		const { user } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ORDER_CANCEL_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		const validation = validateInput(cancelOrderCustomerSchema, {
			id: formData.get("id"),
		});
		if ("error" in validation) return validation.error;
		const { id } = validation.data;

		const order = await prisma.$transaction(async (tx) => {
			const found = await tx.order.findUnique({
				where: { id, ...notDeleted },
				select: {
					id: true,
					orderNumber: true,
					status: true,
					paymentStatus: true,
					total: true,
					userId: true,
					customerEmail: true,
					customerName: true,
					shippingFirstName: true,
					items: {
						select: {
							skuId: true,
							quantity: true,
						},
					},
				},
			});

			if (!found) return null;

			// IDOR protection: only the order owner can cancel
			if (found.userId !== user.id) return null;

			// Customer can only cancel PENDING orders
			if (found.status !== OrderStatus.PENDING) {
				const errorType =
					found.status === OrderStatus.CANCELLED
						? ("already_cancelled" as const)
						: ("not_pending" as const);
				return { ...found, _error: errorType };
			}

			const newPaymentStatus =
				found.paymentStatus === PaymentStatus.PAID
					? PaymentStatus.REFUNDED
					: found.paymentStatus;

			// Update order status
			await tx.order.update({
				where: { id },
				data: {
					status: OrderStatus.CANCELLED,
					paymentStatus: newPaymentStatus,
				},
			});

			// Restore stock (order is PENDING, no physical fulfillment)
			for (const item of found.items) {
				await tx.productSku.update({
					where: { id: item.skuId },
					data: {
						inventory: { increment: item.quantity },
					},
				});
			}

			// Audit trail
			await createOrderAuditTx(tx, {
				orderId: id,
				action: "CANCELLED",
				previousStatus: found.status,
				newStatus: OrderStatus.CANCELLED,
				previousPaymentStatus: found.paymentStatus,
				newPaymentStatus: newPaymentStatus,
				authorId: user.id,
				authorName: user.name || "Client",
				source: HistorySource.CUSTOMER,
				metadata: {
					stockRestored: true,
					itemsCount: found.items.length,
				},
			});

			return { ...found, _newPaymentStatus: newPaymentStatus };
		});

		if (!order) {
			return error(ORDER_ERROR_MESSAGES.NOT_FOUND);
		}

		if ("_error" in order) {
			const message =
				order._error === "already_cancelled"
					? ORDER_ERROR_MESSAGES.ALREADY_CANCELLED
					: "Seules les commandes en attente peuvent être annulées.";
			return error(message);
		}

		// Invalidate caches
		getOrderInvalidationTags(user.id).forEach((tag) => updateTag(tag));

		// Send cancellation email
		if (order.customerEmail) {
			const customerFirstName =
				order.customerName?.split(" ")[0] ||
				order.shippingFirstName ||
				"Client";

			const orderDetailsUrl = buildUrl(
				ROUTES.ACCOUNT.ORDER_DETAIL(order.orderNumber)
			);

			try {
				await sendCancelOrderConfirmationEmail({
					to: order.customerEmail,
					orderNumber: order.orderNumber,
					customerName: customerFirstName,
					orderTotal: order.total,
					wasRefunded: order._newPaymentStatus === PaymentStatus.REFUNDED,
					orderDetailsUrl,
				});
			} catch (emailError) {
				console.error("[CANCEL_ORDER_CUSTOMER] Email send failed:", emailError);
			}
		}

		return success("Votre commande a été annulée.");
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.CANCEL_FAILED);
	}
}
