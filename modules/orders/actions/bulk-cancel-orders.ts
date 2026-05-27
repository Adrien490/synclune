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
import { logger } from "@/shared/lib/logger";
import { notDeleted, prisma } from "@/shared/lib/prisma";
import { TX_MAX_WAIT_LONG, TX_TIMEOUT_LONG } from "@/shared/lib/prisma-tx-options";
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

		// Ventile la sélection : éligibles vs ignorées (par statut) pour donner
		// un feedback admin précis. Le filtre éligibilité reste strict :
		// status=PENDING ET paymentStatus=PENDING.
		const allSelected = await prisma.order.findMany({
			where: { id: { in: orderIds }, ...notDeleted },
			select: { id: true, status: true, paymentStatus: true },
		});

		const orderIdsEligible = allSelected
			.filter((o) => o.status === OrderStatus.PENDING && o.paymentStatus === PaymentStatus.PENDING)
			.map((o) => o.id);

		const skippedBreakdown = {
			alreadyCancelled: allSelected.filter((o) => o.status === OrderStatus.CANCELLED).length,
			alreadyShipped: allSelected.filter((o) => o.status === OrderStatus.SHIPPED).length,
			alreadyDelivered: allSelected.filter((o) => o.status === OrderStatus.DELIVERED).length,
			alreadyPaid: allSelected.filter(
				(o) =>
					o.status !== OrderStatus.CANCELLED &&
					o.status !== OrderStatus.SHIPPED &&
					o.status !== OrderStatus.DELIVERED &&
					o.paymentStatus !== PaymentStatus.PENDING,
			).length,
			notFound: orderIds.length - allSelected.length,
		};

		const orders = await prisma.order.findMany({
			where: {
				id: { in: orderIdsEligible },
				...notDeleted,
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

		await prisma.$transaction(
			async (tx) => {
				// Agrège les decrements par discountId pour batcher en fin de transaction.
				// Plusieurs orders peuvent partager le même discount → on doit décrémenter
				// par le count total, pas par 1 (sinon perte d'usages).
				const discountDecrements = new Map<string, number>();
				const ordersWithUsages: string[] = [];

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
						discountDecrements.set(
							usage.discountId,
							(discountDecrements.get(usage.discountId) ?? 0) + 1,
						);
					}

					if (usages.length > 0) {
						ordersWithUsages.push(order.id);
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

				// Batch decrement usageCount par discountId puis cleanup discount usages.
				// Si N orders annulés partagent le même discount, decrement par N.
				for (const [discountId, count] of discountDecrements) {
					await tx.discount.update({
						where: { id: discountId },
						data: { usageCount: { decrement: count } },
					});
				}

				if (ordersWithUsages.length > 0) {
					await tx.discountUsage.deleteMany({
						where: { orderId: { in: ordersWithUsages } },
					});
				}
			},
			{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
		);

		const tags = new Set<string>();
		for (const o of cancelledOrders) {
			getOrderInvalidationTags(o.userId ?? undefined, o.id).forEach((tag) => tags.add(tag));
		}
		tags.forEach((tag) => updateTag(tag));

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
		const reasons: string[] = [];
		if (skippedBreakdown.alreadyShipped > 0) {
			reasons.push(`${skippedBreakdown.alreadyShipped} expédiée(s)`);
		}
		if (skippedBreakdown.alreadyDelivered > 0) {
			reasons.push(`${skippedBreakdown.alreadyDelivered} livrée(s)`);
		}
		if (skippedBreakdown.alreadyCancelled > 0) {
			reasons.push(`${skippedBreakdown.alreadyCancelled} déjà annulée(s)`);
		}
		if (skippedBreakdown.alreadyPaid > 0) {
			reasons.push(`${skippedBreakdown.alreadyPaid} déjà payée(s)`);
		}
		if (skippedBreakdown.notFound > 0) {
			reasons.push(`${skippedBreakdown.notFound} introuvable(s)`);
		}
		const skippedHint = skipped > 0 ? ` (ignorées : ${reasons.join(", ")})` : "";
		const plural = cancelledOrders.length > 1 ? "s" : "";
		return success(`${cancelledOrders.length} commande${plural} annulée${plural}${skippedHint}`, {
			count: cancelledOrders.length,
			skipped,
			skippedBreakdown,
		});
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de l'annulation en lot");
	}
}
