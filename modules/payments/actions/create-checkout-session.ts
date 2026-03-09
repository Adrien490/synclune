"use server";

import { getSession } from "@/modules/auth/lib/get-current-session";
import { getSkuDetails } from "@/modules/cart/services/sku-validation.service";
import { getOrCreateCartSessionId } from "@/modules/cart/lib/cart-session";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { PAYMENT_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import type { ShippingCountry } from "@/shared/constants/countries";
import type { ActionState } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { createCheckoutSessionSchema } from "@/modules/payments/schemas/create-checkout-session-schema";
import { parseFullName } from "@/modules/payments/utils/parse-full-name";
import { DISCOUNT_CACHE_TAGS } from "@/modules/discounts/constants/cache";
import { stripe, CircuitBreakerError } from "@/shared/lib/stripe";
import { DEFAULT_CURRENCY } from "@/shared/constants/currency";
import {
	validateInput,
	handleActionError,
	success,
	error,
	BusinessError,
	safeFormGet,
	safeFormGetJSON,
} from "@/shared/lib/actions";
import { sendAdminCheckoutFailedAlert } from "@/modules/emails/services/admin-emails";
import { getOrCreateStripeCustomer } from "@/modules/payments/services/stripe-customer.service";
import { buildStripeLineItems } from "@/modules/payments/services/checkout-line-items.service";
import { createStripeCheckoutSession } from "@/modules/payments/services/checkout-session-builder.service";
import { createOrderInTransaction } from "@/modules/payments/services/order-creation.service";
import { logger } from "@/shared/lib/logger";
import * as Sentry from "@sentry/nextjs";

export const createCheckoutSession = async (
	_prevState: ActionState | undefined,
	formData: FormData,
) => {
	return Sentry.startSpan(
		{ name: "action.createCheckoutSession", op: "checkout" },
		async (span) => {
			try {
				// 1. Retrieve authenticated user (optional for guest checkout)
				const session = await getSession();
				const userId = session?.user.id ?? null;
				const userEmail = session?.user.email ?? null;

				// Custom Sentry tags for checkout observability
				span.setAttribute("checkout.is_guest", !userId);
				if (userId) span.setAttribute("checkout.user_id", userId);

				let stripeCustomerId: string | null = null;
				if (userId) {
					const user = await prisma.user.findUnique({
						where: { id: userId },
						select: { stripeCustomerId: true },
					});
					stripeCustomerId = user?.stripeCustomerId ?? null;
				}

				// 2. Rate limiting
				const sessionId = !userId ? await getOrCreateCartSessionId() : null;
				const headersList = await headers();
				const ipAddress = await getClientIp(headersList);

				// For guests: combine email+IP to prevent bypass via new sessionId
				const rawGuestEmail = !userId ? (safeFormGet(formData, "email") ?? null) : null;
				const rateLimitId = userId
					? `user:${userId}`
					: rawGuestEmail && ipAddress
						? `guest:${rawGuestEmail.toLowerCase().trim()}:${ipAddress}`
						: getRateLimitIdentifier(null, sessionId ?? null, ipAddress);
				const rateLimit = await checkRateLimit(
					rateLimitId,
					PAYMENT_LIMITS.CREATE_SESSION,
					ipAddress,
				);

				if (!rateLimit.success) {
					return error(
						rateLimit.error ?? "Trop de tentatives de paiement. Veuillez réessayer plus tard.",
					);
				}

				// 3. Parse and validate form data
				const cartItems = safeFormGetJSON<unknown>(formData, "cartItems");
				const shippingAddress = safeFormGetJSON<unknown>(formData, "shippingAddress");
				const email = safeFormGet(formData, "email") ?? undefined;
				const discountCode = safeFormGet(formData, "discountCode") ?? undefined;
				const termsAccepted = safeFormGet(formData, "termsAccepted") ?? undefined;

				if (!cartItems || !shippingAddress) {
					return error("Format JSON invalide pour les donnees du panier.");
				}

				const rawData = {
					cartItems,
					shippingAddress,
					email,
					discountCode,
					termsAccepted,
				};
				const validated = validateInput(createCheckoutSessionSchema, rawData);
				if ("error" in validated) return validated.error;
				const validatedData = validated.data;

				// 4. Resolve email (user or guest)
				const finalEmail = validatedData.email ?? userEmail;
				if (!finalEmail) {
					return error(
						userId
							? "Votre adresse email est manquante. Veuillez vous reconnecter."
							: "L'email est requis pour une commande invité.",
					);
				}

				span.setAttribute("checkout.country", validatedData.shippingAddress.country);
				span.setAttribute("checkout.has_discount", !!validatedData.discountCode);

				const { firstName, lastName } = parseFullName(validatedData.shippingAddress.fullName);

				// 5. Create or retrieve Stripe customer
				const customerResult = await getOrCreateStripeCustomer(stripeCustomerId, {
					email: finalEmail!,
					firstName,
					lastName,
					address: validatedData.shippingAddress,
					phoneNumber: validatedData.shippingAddress.phoneNumber,
					userId,
				});
				if ("error" in customerResult && customerResult.error) {
					return error(customerResult.error);
				}
				stripeCustomerId = customerResult.customerId;

				// 6. Load SKU details and verify stock/prices
				const skuIds = validatedData.cartItems.map((item) => item.skuId);
				const skuDetailsResults = await Promise.all(
					skuIds.map((skuId) => getSkuDetails({ skuId })),
				);

				const failedSkus = skuDetailsResults.filter((result) => !result.success);
				if (failedSkus.length > 0) {
					return error("Certains articles ne sont plus disponibles.");
				}

				for (const cartItem of validatedData.cartItems) {
					const skuResult = skuDetailsResults.find(
						(r) => r.success && r.data?.sku.id === cartItem.skuId,
					);
					if (!skuResult?.success || !skuResult.data) continue;

					if (cartItem.priceAtAdd !== skuResult.data.sku.priceInclTax) {
						return error(
							"Les prix de certains articles ont changé. Actualisez votre panier avant de procéder au paiement.",
						);
					}
				}

				// 7. Build Stripe line items
				const { lineItems, subtotal } = buildStripeLineItems(
					validatedData.cartItems,
					skuDetailsResults,
				);

				// 8. Atomic transaction: verify stock + create order + apply discount
				const orderResult = await createOrderInTransaction({
					cartItems: validatedData.cartItems,
					skuDetailsResults,
					subtotal,
					shippingAddress: validatedData.shippingAddress,
					firstName,
					lastName,
					userId,
					finalEmail,
					discountCode: validatedData.discountCode,
				});

				const {
					order,
					appliedDiscountId,
					discountAmount: orderDiscountAmount,
					appliedDiscountCode: orderDiscountCode,
				} = orderResult;

				span.setAttribute("checkout.total", order.total);
				span.setAttribute("checkout.item_count", validatedData.cartItems.length);

				if (appliedDiscountId) {
					updateTag(DISCOUNT_CACHE_TAGS.USAGE(appliedDiscountId));
				}

				// 9 + 10. Create Stripe coupon (if applicable) then checkout session
				// Both are inside the same try block so a coupon failure also triggers cleanup
				let checkoutSession;
				let stripeCouponId: string | undefined;
				try {
					if (orderDiscountAmount > 0 && orderDiscountCode && appliedDiscountId) {
						const coupon = await stripe.coupons.create(
							{
								amount_off: orderDiscountAmount,
								currency: DEFAULT_CURRENCY,
								duration: "once",
								name: `Code promo ${orderDiscountCode}`,
							},
							{ idempotencyKey: `coupon-${order.id}-${appliedDiscountId}` },
						);
						stripeCouponId = coupon.id;
					}

					checkoutSession = await createStripeCheckoutSession({
						lineItems,
						stripeCustomerId,
						finalEmail,
						stripeCouponId,
						orderId: order.id,
						orderNumber: order.orderNumber,
						userId,
						sessionId,
						shippingCountry: validatedData.shippingAddress.country as ShippingCountry,
						shippingPostalCode: validatedData.shippingAddress.postalCode,
					});
				} catch (stripeError) {
					// Cleanup orphan order and discount usage on Stripe failure
					await cleanupFailedCheckout(order.id, orderDiscountCode, stripeCouponId);

					if (stripeError instanceof CircuitBreakerError) {
						return error(
							"Le service de paiement est temporairement indisponible. Veuillez réessayer dans quelques instants.",
						);
					}

					sendAdminCheckoutFailedAlert({
						orderNumber: order.orderNumber,
						customerEmail: finalEmail,
						total: order.total,
						errorMessage: stripeError instanceof Error ? stripeError.message : String(stripeError),
					}).catch(() => {});

					throw stripeError;
				}

				if (!checkoutSession.client_secret) {
					throw new BusinessError("Session Stripe créée sans client_secret. Veuillez réessayer.");
				}

				// Invalidate cart cache
				const cartTags = getCartInvalidationTags(userId ?? undefined, sessionId ?? undefined);
				cartTags.forEach((tag) => updateTag(tag));

				return success("Session de paiement creee avec succes.", {
					clientSecret: checkoutSession.client_secret,
					orderId: order.id,
					orderNumber: order.orderNumber,
				});
			} catch (e) {
				return handleActionError(
					e,
					"Une erreur est survenue lors de la creation de la session de paiement.",
					{ action: "createCheckoutSession" },
				);
			}
		},
	);
};

/**
 * Cleans up an orphan order and associated discount usage when Stripe session creation fails.
 * Order: discountUsage → discount → order (respects FK onDelete: Restrict on DiscountUsage.orderId)
 */
async function cleanupFailedCheckout(
	orderId: string,
	orderDiscountCode: string | null,
	stripeCouponId: string | undefined,
) {
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

	if (stripeCouponId) {
		await stripe.coupons.del(stripeCouponId).catch((e) => {
			logger.warn("[CLEANUP] Failed to delete Stripe coupon after checkout failure", {
				stripeCouponId,
				error: e instanceof Error ? e.message : String(e),
			});
		});
	}
}
