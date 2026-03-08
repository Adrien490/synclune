"use server";

import {
	OrderStatus,
	PaymentStatus,
	FulfillmentStatus,
	type Prisma,
	HistorySource,
} from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { updateTag } from "next/cache";
import { logger } from "@/shared/lib/logger";

import { sendOrderConfirmationEmail } from "@/modules/emails/services/order-emails";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
import { logAudit } from "@/shared/lib/audit-log";
import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
import { markAsPaidSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";
import { handleActionError, safeFormGet } from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";

/**
 * Marque une commande comme payée manuellement
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - La commande doit être en statut PENDING
 * - Le paiement ne doit pas déjà être PAID
 * - Passe PaymentStatus à PAID
 * - Passe OrderStatus à PROCESSING
 * - Passe FulfillmentStatus à PROCESSING
 * - Enregistre la date de paiement
 */
export async function markAsPaid(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.MARK_AS_PAID);
		if ("error" in rateLimit) return rateLimit.error;

		const rawId = safeFormGet(formData, "id");
		const note = safeFormGet(formData, "note");

		const result = markAsPaidSchema.safeParse({ id: rawId, note });
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message ?? "ID invalide",
			};
		}

		const { id } = result.data;

		// Transaction: fetch + validate + stock check + update + audit atomically (prevents TOCTOU race)
		const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
			const found = await tx.order.findUnique({
				where: { id, ...notDeleted },
				select: {
					id: true,
					orderNumber: true,
					status: true,
					paymentStatus: true,
					fulfillmentStatus: true,
					userId: true,
					customerEmail: true,
					customerName: true,
					subtotal: true,
					discountAmount: true,
					shippingCost: true,
					total: true,
					shippingFirstName: true,
					shippingLastName: true,
					shippingAddress1: true,
					shippingAddress2: true,
					shippingPostalCode: true,
					shippingCity: true,
					shippingCountry: true,
					stripeCheckoutSessionId: true,
					items: {
						select: {
							skuId: true,
							quantity: true,
							productTitle: true,
							skuColor: true,
							skuMaterial: true,
							skuSize: true,
							price: true,
						},
					},
				},
			});

			if (!found) return null;

			if (found.paymentStatus === PaymentStatus.PAID) {
				return { ...found, _error: "already_paid" as const };
			}

			if (found.status === OrderStatus.CANCELLED) {
				return { ...found, _error: "cancelled" as const };
			}

			// Stock reservation check
			const stockAlreadyReserved = !!found.stripeCheckoutSessionId;

			// Atomic stock decrement with conditional WHERE (prevents overselling)
			if (!stockAlreadyReserved && found.items.length > 0) {
				for (const item of found.items) {
					const result = await tx.productSku.updateMany({
						where: {
							id: item.skuId,
							isActive: true,
							inventory: { gte: item.quantity },
						},
						data: {
							inventory: { decrement: item.quantity },
						},
					});

					if (result.count === 0) {
						throw new Error(`Stock insuffisant ou SKU inactif pour ${item.productTitle}`);
					}
				}
			}

			// Mettre à jour la commande
			await tx.order.update({
				where: { id },
				data: {
					paymentStatus: PaymentStatus.PAID,
					status: OrderStatus.PROCESSING,
					fulfillmentStatus: FulfillmentStatus.PROCESSING,
					paidAt: new Date(),
				},
			});

			// Audit trail (Best Practice Stripe 2025)
			await createOrderAuditTx(tx, {
				orderId: id,
				action: "PAID",
				previousStatus: found.status,
				newStatus: OrderStatus.PROCESSING,
				previousPaymentStatus: found.paymentStatus,
				newPaymentStatus: PaymentStatus.PAID,
				previousFulfillmentStatus: found.fulfillmentStatus,
				newFulfillmentStatus: FulfillmentStatus.PROCESSING,
				authorId: adminUser.id,
				authorName: adminUser.name ?? "Admin",
				source: HistorySource.ADMIN,
				metadata: {
					stockAdjusted: !stockAlreadyReserved,
					itemsCount: found.items.length,
				},
			});

			return { ...found, _stockAlreadyReserved: stockAlreadyReserved };
		});

		if (!order) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: ORDER_ERROR_MESSAGES.NOT_FOUND,
			};
		}

		if ("_error" in order) {
			const message =
				order._error === "already_paid"
					? ORDER_ERROR_MESSAGES.ALREADY_PAID
					: ORDER_ERROR_MESSAGES.CANNOT_PAY_CANCELLED;
			return {
				status: ActionStatus.ERROR,
				message,
			};
		}

		// Invalider les caches (orders list admin + commandes user)
		getOrderInvalidationTags(order.userId ?? undefined, order.id).forEach((tag) => updateTag(tag));

		// Send order confirmation email for manual payment
		let emailSent = false;
		if (order.customerEmail) {
			const trackingUrl = buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(order.orderNumber));
			try {
				await sendOrderConfirmationEmail({
					to: order.customerEmail,
					orderNumber: order.orderNumber,
					customerName: order.customerName || "Client",
					items: order.items.map((item) => ({
						productTitle: item.productTitle,
						skuColor: item.skuColor,
						skuMaterial: item.skuMaterial,
						skuSize: item.skuSize,
						quantity: item.quantity,
						price: item.price,
					})),
					subtotal: order.subtotal,
					discount: order.discountAmount,
					shipping: order.shippingCost,
					total: order.total,
					shippingAddress: {
						firstName: order.shippingFirstName || "",
						lastName: order.shippingLastName || "",
						address1: order.shippingAddress1 || "",
						address2: order.shippingAddress2,
						postalCode: order.shippingPostalCode || "",
						city: order.shippingCity || "",
						country: order.shippingCountry || "France",
					},
					trackingUrl,
				});
				emailSent = true;
			} catch (emailError) {
				logger.error("Échec envoi email", emailError, { action: "mark-as-paid" });
			}
		}

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "order.markPaid",
			targetType: "order",
			targetId: order.id,
			metadata: {
				orderNumber: order.orderNumber,
				previousPaymentStatus: order.paymentStatus,
			},
		});

		const stockMessage =
			!order._stockAlreadyReserved && order.items.length > 0
				? ` Stock décrémenté pour ${order.items.length} article(s).`
				: "";

		const emailMessage = emailSent
			? " Email envoyé au client."
			: order.customerEmail
				? " (Échec envoi email)"
				: "";

		return {
			status: ActionStatus.SUCCESS,
			message: `Commande ${order.orderNumber} marquée comme payée. Prête pour préparation.${stockMessage}${emailMessage}`,
		};
	} catch (error) {
		return handleActionError(error, ORDER_ERROR_MESSAGES.MARK_AS_PAID_FAILED);
	}
}
