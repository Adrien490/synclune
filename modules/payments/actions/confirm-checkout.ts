"use server";

import { getSession } from "@/modules/auth/lib/get-current-session";
import { getSkuDetails } from "@/modules/cart/services/sku-validation.service";
import { getOrCreateCartSessionId } from "@/modules/cart/lib/cart-session";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { PAYMENT_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import { stripe, withStripeCircuitBreaker, CircuitBreakerError } from "@/shared/lib/stripe";
import { updateTag } from "next/cache";
import { ajPayment } from "@/shared/lib/arcjet";
import { getBaseUrl } from "@/shared/constants/urls";
import { headers } from "next/headers";
import { DISCOUNT_CACHE_TAGS } from "@/modules/discounts/constants/cache";
import { parseFullName } from "@/modules/payments/utils/parse-full-name";
import { getOrCreateStripeCustomer } from "@/modules/payments/services/stripe-customer.service";
import { createOrderInTransaction } from "@/modules/payments/services/order-creation.service";
import { buildStripeLineItems } from "@/modules/payments/services/checkout-line-items.service";
import { confirmCheckoutSchema, type ConfirmCheckoutData } from "../schemas/checkout.schema";
import { saveAddressInTransaction } from "@/modules/addresses/services/save-address.service";
import { logger } from "@/shared/lib/logger";
import Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";

interface ConfirmCheckoutResult {
	success: true;
	orderId: string;
	orderNumber: string;
	finalAmount: number;
	addressSaved?: boolean;
}

interface ConfirmCheckoutError {
	success: false;
	error: string;
}

export async function confirmCheckout(
	data: ConfirmCheckoutData,
): Promise<ConfirmCheckoutResult | ConfirmCheckoutError> {
	return Sentry.startSpan({ name: "action.confirmCheckout", op: "checkout" }, async (span) => {
		try {
			// 1. Auth check (optional - guest OK)
			const session = await getSession();
			const userId = session?.user.id ?? null;
			const userEmail = session?.user.email ?? null;

			span.setAttribute("checkout.is_guest", !userId);

			// 2a. Arcjet: distributed rate limiting + shield + bot detection
			const headersList = await headers();
			const arcjetRequest = new Request(`${getBaseUrl()}/payment/confirm`, {
				method: "POST",
				headers: headersList,
			});
			const arcjetDecision = await ajPayment.protect(arcjetRequest, { requested: 1 });
			if (arcjetDecision.isDenied()) {
				return {
					success: false,
					error: "Trop de tentatives. Veuillez réessayer plus tard.",
				};
			}

			// 2b. In-memory rate limiting (complementary, for burst protection)
			const sessionId = !userId ? await getOrCreateCartSessionId() : null;
			const ipAddress = await getClientIp(headersList);
			const rateLimitId = userId
				? `user:${userId}`
				: data.email && ipAddress
					? `guest:${data.email.toLowerCase().trim()}:${ipAddress}`
					: getRateLimitIdentifier(null, sessionId ?? null, ipAddress);

			const rateLimit = await checkRateLimit(rateLimitId, PAYMENT_LIMITS.CREATE_SESSION, ipAddress);
			if (!rateLimit.success) {
				return {
					success: false,
					error: rateLimit.error ?? "Trop de tentatives. Veuillez réessayer plus tard.",
				};
			}

			// 3. Validate input
			const validation = confirmCheckoutSchema.safeParse(data);
			if (!validation.success) {
				const firstError = validation.error.issues[0]?.message ?? "Données invalides";
				return { success: false, error: firstError };
			}
			const v = validation.data;

			// 3b. Idempotence check — if an order already exists for this PI, return it
			const existingOrder = await prisma.order.findUnique({
				where: { stripePaymentIntentId: v.paymentIntentId },
				select: { id: true, orderNumber: true, total: true },
			});
			if (existingOrder) {
				return {
					success: true,
					orderId: existingOrder.id,
					orderNumber: existingOrder.orderNumber,
					finalAmount: existingOrder.total,
				};
			}

			// 4. Resolve email
			const finalEmail = v.email ?? userEmail;
			if (!finalEmail) {
				return {
					success: false,
					error: userId
						? "Votre adresse email est manquante. Veuillez vous reconnecter."
						: "L'email est requis pour une commande invité.",
				};
			}

			const { firstName, lastName } = parseFullName(v.shippingAddress.fullName);

			// 5. Get or create Stripe customer
			let stripeCustomerId: string | null = null;
			if (userId) {
				const user = await prisma.user.findUnique({
					where: { id: userId },
					select: { stripeCustomerId: true },
				});
				stripeCustomerId = user?.stripeCustomerId ?? null;
			}

			const customerResult = await getOrCreateStripeCustomer(stripeCustomerId, {
				email: finalEmail,
				firstName,
				lastName,
				address: v.shippingAddress,
				phoneNumber: v.shippingAddress.phoneNumber,
				userId,
			});
			if (!("error" in customerResult) || !customerResult.error) {
				stripeCustomerId = customerResult.customerId;
			}

			// 6. Re-validate cart (stock + prices)
			const skuDetailsResults = await Promise.all(
				v.cartItems.map((item) => getSkuDetails({ skuId: item.skuId })),
			);

			const failedSkus = skuDetailsResults.filter((r) => !r.success);
			if (failedSkus.length > 0) {
				return { success: false, error: "Certains articles ne sont plus disponibles." };
			}

			for (const cartItem of v.cartItems) {
				const skuResult = skuDetailsResults.find(
					(r) => r.success && r.data?.sku.id === cartItem.skuId,
				);
				if (!skuResult?.success || !skuResult.data) continue;
				if (cartItem.priceAtAdd !== skuResult.data.sku.priceInclTax) {
					return {
						success: false,
						error: "Les prix de certains articles ont changé. Actualisez votre panier.",
					};
				}
			}

			// 7. Build line items for subtotal
			const { subtotal } = buildStripeLineItems(v.cartItems, skuDetailsResults);

			// 8. Create order in transaction
			const orderResult = await createOrderInTransaction({
				cartItems: v.cartItems,
				skuDetailsResults,
				subtotal,
				shippingAddress: v.shippingAddress,
				firstName,
				lastName,
				userId,
				finalEmail,
				discountCode: v.discountCode,
				paymentIntentId: v.paymentIntentId,
			});

			const { order, appliedDiscountId, appliedDiscountCode: orderDiscountCode } = orderResult;

			span.setAttribute("checkout.total", order.total);
			span.setAttribute("checkout.item_count", v.cartItems.length);

			if (appliedDiscountId) {
				updateTag(DISCOUNT_CACHE_TAGS.USAGE(appliedDiscountId));
			}

			// 9. Update PI with order metadata (single call, no retrieve race condition)
			try {
				await withStripeCircuitBreaker(() =>
					stripe.paymentIntents.update(v.paymentIntentId, {
						amount: order.total,
						receipt_email: finalEmail,
						metadata: {
							orderId: order.id,
							orderNumber: order.orderNumber,
							userId: userId ?? "guest",
							...(sessionId && { guestSessionId: sessionId }),
						},
					}),
				);
			} catch (stripeError) {
				if (stripeError instanceof Stripe.errors.StripeInvalidRequestError) {
					const isAlreadySucceeded = stripeError.message.includes("succeeded");
					const isAlreadyCanceled = stripeError.message.includes("canceled");
					if (isAlreadySucceeded || isAlreadyCanceled) {
						await cleanupFailedCheckout(order.id, orderDiscountCode);
						return {
							success: false,
							error: isAlreadySucceeded
								? "Ce paiement a déjà été effectué."
								: "Ce paiement a été annulé. Veuillez recommencer.",
						};
					}
				}
				// Cleanup orphan order on Stripe failure
				await cleanupFailedCheckout(order.id, orderDiscountCode);
				if (stripeError instanceof CircuitBreakerError) {
					return {
						success: false,
						error: "Le service de paiement est temporairement indisponible.",
					};
				}
				throw stripeError;
			}

			// 10. Save address if requested (non-blocking, logged on failure)
			let addressSaved = true;
			if (v.saveInfo && userId) {
				try {
					await prisma.$transaction((tx) =>
						saveAddressInTransaction(tx, userId, {
							firstName,
							lastName,
							address1: v.shippingAddress.addressLine1,
							address2: v.shippingAddress.addressLine2 ?? null,
							postalCode: v.shippingAddress.postalCode,
							city: v.shippingAddress.city,
							country: v.shippingAddress.country,
							phone: v.shippingAddress.phoneNumber,
						}),
					);
				} catch (e) {
					addressSaved = false;
					logger.warn("Failed to save address during checkout", {
						service: "checkout",
						error: e instanceof Error ? e.message : String(e),
					});
				}
			}

			// 12. Invalidate cart cache
			const cartTags = getCartInvalidationTags(userId ?? undefined, sessionId ?? undefined);
			cartTags.forEach((tag) => updateTag(tag));

			return {
				success: true,
				orderId: order.id,
				orderNumber: order.orderNumber,
				finalAmount: order.total,
				...(v.saveInfo && userId && { addressSaved }),
			};
		} catch (e) {
			logger.error("Failed to confirm checkout", e, { service: "checkout" });
			Sentry.captureException(e);
			return {
				success: false,
				error: "Une erreur est survenue lors de la validation de la commande.",
			};
		}
	});
}

async function cleanupFailedCheckout(orderId: string, orderDiscountCode: string | null) {
	await prisma.$transaction(async (tx) => {
		if (orderDiscountCode) {
			await tx.discountUsage.deleteMany({ where: { orderId } });
			await tx.discount.updateMany({
				where: { code: orderDiscountCode, usageCount: { gt: 0 } },
				data: { usageCount: { decrement: 1 } },
			});
		}
		await tx.order.delete({ where: { id: orderId } });
	});
}
