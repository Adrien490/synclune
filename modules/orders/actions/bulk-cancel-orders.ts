"use server";

import { updateTag } from "next/cache";

import { HistorySource, OrderStatus, PaymentStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { sendCancelOrderConfirmationEmail } from "@/modules/emails/services/status-emails";
import {
	error,
	handleActionError,
	parseFormIds,
	safeFormGet,
	success,
	validateInput,
} from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { logger } from "@/shared/lib/logger";
import { notDeleted, prisma } from "@/shared/lib/prisma";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { sanitizeText } from "@/shared/lib/sanitize";
import { ROUTES, buildUrl } from "@/shared/constants/urls";
import type { ActionState } from "@/shared/types/server-action";

import { getOrderInvalidationTags } from "../constants/cache";
import { bulkCancelOrdersSchema } from "../schemas/order.schemas";
import { extractCustomerFirstName } from "../utils/customer-name";
import { createOrderAuditTx } from "../utils/order-audit";

/**
 * Annulation en lot de commandes — UNIQUEMENT PENDING/UNPAID.
 *
 * Pour la sécurité Stripe, les commandes payées sont exclues : elles doivent
 * être annulées individuellement avec gestion explicite du remboursement.
 *
 * Pour chaque commande éligible :
 * - status → CANCELLED
 * - Stock restauré (paymentStatus PENDING)
 * - DiscountUsage libérées
 * - Audit log atomique (createOrderAuditTx)
 * - Email best-effort post-transaction
 *
 * formData :
 * - `orderIds` : JSON array cuid2 (1..50)
 * - `reason`   : string optionnel
 */
export async function bulkCancelOrders(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.BULK_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const idsResult = parseFormIds(formData, "orderIds");
		if ("error" in idsResult) return idsResult.error;

		const rawReason = safeFormGet(formData, "reason");
		const reason = rawReason ? sanitizeText(rawReason) : null;

		const validation = validateInput(bulkCancelOrdersSchema, {
			orderIds: idsResult.ids,
			reason: reason ?? undefined,
		});
		if ("error" in validation) return validation.error;

		const { orderIds } = validation.data;

		const orders = await prisma.order.findMany({
			where: {
				id: { in: orderIds },
				...notDeleted,
				status: OrderStatus.PENDING,
				paymentStatus: PaymentStatus.PENDING,
			},
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
					select: { id: true, skuId: true, quantity: true, price: true },
				},
			},
		});

		if (orders.length === 0) {
			return error(
				"Aucune commande éligible. Seules les commandes PENDING non payées peuvent être annulées en lot.",
			);
		}

		const cancelledOrders: Array<{
			id: string;
			orderNumber: string;
			userId: string | null;
			customerEmail: string | null;
			customerName: string | null;
			shippingFirstName: string | null;
			total: number;
		}> = [];

		await prisma.$transaction(async (tx) => {
			for (const order of orders) {
				await tx.order.update({
					where: { id: order.id },
					data: { status: OrderStatus.CANCELLED },
				});

				for (const item of order.items) {
					await tx.productSku.update({
						where: { id: item.skuId },
						data: { inventory: { increment: item.quantity } },
					});
				}

				const usages = await tx.discountUsage.findMany({
					where: { orderId: order.id },
					select: { id: true, discountId: true },
				});

				for (const usage of usages) {
					await tx.discount.update({
						where: { id: usage.discountId },
						data: { usageCount: { decrement: 1 } },
					});
				}

				if (usages.length > 0) {
					await tx.discountUsage.deleteMany({ where: { orderId: order.id } });
				}

				await createOrderAuditTx(tx, {
					orderId: order.id,
					action: "CANCELLED",
					previousStatus: order.status,
					newStatus: OrderStatus.CANCELLED,
					previousPaymentStatus: order.paymentStatus,
					newPaymentStatus: order.paymentStatus,
					note: reason ?? "Annulation en lot",
					authorId: adminUser.id,
					authorName: adminUser.name ?? "Admin",
					source: HistorySource.ADMIN,
					metadata: {
						stockRestored: true,
						itemsCount: order.items.length,
						bulkOperation: true,
					},
				});

				cancelledOrders.push({
					id: order.id,
					orderNumber: order.orderNumber,
					userId: order.userId,
					customerEmail: order.customerEmail,
					customerName: order.customerName,
					shippingFirstName: order.shippingFirstName,
					total: order.total,
				});
			}
		});

		const tags = new Set<string>();
		for (const o of cancelledOrders) {
			getOrderInvalidationTags(o.userId ?? undefined, o.id).forEach((tag) => tags.add(tag));
		}
		tags.forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "order.bulkCancel",
			targetType: "order",
			targetId: cancelledOrders.map((o) => o.id).join(","),
			metadata: {
				count: cancelledOrders.length,
				reason,
				orderNumbers: cancelledOrders.map((o) => o.orderNumber),
				skipped: orderIds.length - cancelledOrders.length,
			},
		});

		// Best-effort email per customer (fire-and-forget, errors logged)
		for (const o of cancelledOrders) {
			if (!o.customerEmail) continue;
			const customerFirstName = extractCustomerFirstName(o.customerName, o.shippingFirstName);
			const orderDetailsUrl = buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(o.orderNumber));
			void sendCancelOrderConfirmationEmail({
				to: o.customerEmail,
				orderNumber: o.orderNumber,
				customerName: customerFirstName,
				orderTotal: o.total,
				reason: reason ?? undefined,
				wasRefunded: false,
				orderDetailsUrl,
			}).catch((emailError) => {
				logger.error("Échec envoi email annulation lot", emailError, {
					action: "bulk-cancel-orders",
					orderId: o.id,
				});
			});
		}

		const skipped = orderIds.length - cancelledOrders.length;
		const skippedHint =
			skipped > 0
				? ` (${skipped} commande${skipped > 1 ? "s" : ""} ignorée${skipped > 1 ? "s" : ""} : déjà payée${skipped > 1 ? "s" : ""} ou expédiée${skipped > 1 ? "s" : ""})`
				: "";
		const plural = cancelledOrders.length > 1 ? "s" : "";
		return success(`${cancelledOrders.length} commande${plural} annulée${plural}${skippedHint}`, {
			count: cancelledOrders.length,
			skipped,
		});
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de l'annulation en lot");
	}
}
