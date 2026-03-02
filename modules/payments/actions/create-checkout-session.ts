"use server";

import { getSession } from "@/modules/auth/lib/get-current-session";
import { getSkuDetails } from "@/modules/cart/services/sku-validation.service";
import { getOrCreateCartSessionId } from "@/modules/cart/lib/cart-session";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { PAYMENT_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { calculateShipping } from "@/modules/orders/services/shipping.service";
import { generateOrderNumber } from "@/modules/orders/services/order-generation.service";
import type { ShippingCountry } from "@/shared/constants/countries";
import type { ActionState } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { createCheckoutSessionSchema } from "@/modules/payments/schemas/create-checkout-session-schema";
import { parseFullName } from "@/modules/payments/utils/parse-full-name";

import { DISCOUNT_ERROR_MESSAGES } from "@/modules/discounts/constants/discount.constants";
import { DISCOUNT_CACHE_TAGS } from "@/modules/discounts/constants/cache";
import { checkDiscountEligibility } from "@/modules/discounts/services/discount-eligibility.service";
import {
	calculateDiscountWithExclusion,
	type CartItemForDiscount,
} from "@/modules/discounts/services/discount-calculation.service";
import { stripe, CircuitBreakerError } from "@/shared/lib/stripe";
import { getValidImageUrl } from "@/shared/lib/media-validation";
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
import * as Sentry from "@sentry/nextjs";

export const createCheckoutSession = async (
	_prevState: ActionState | undefined,
	formData: FormData,
) => {
	return Sentry.startSpan({ name: "action.createCheckoutSession", op: "checkout" }, async () => {
		try {
			// 1. Retrieve authenticated user (optional for guest checkout)
			const session = await getSession();
			const userId = session?.user.id ?? null;
			const userEmail = session?.user.email ?? null;

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

			const rateLimitId = getRateLimitIdentifier(userId, sessionId ?? null, ipAddress);
			const rateLimit = await checkRateLimit(rateLimitId, PAYMENT_LIMITS.CREATE_SESSION, ipAddress);

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

			if (!cartItems || !shippingAddress) {
				return error("Format JSON invalide pour les donnees du panier.");
			}

			const rawData = {
				cartItems,
				shippingAddress,
				email,
				discountCode,
			};
			const validated = validateInput(createCheckoutSessionSchema, rawData);
			if ("error" in validated) return validated.error;
			const validatedData = validated.data;

			// 4. Resolve email (user or guest)
			const finalEmail = validatedData.email ?? userEmail;
			if (!userId && !finalEmail) {
				return error("L'email est requis pour une commande invite.");
			}

			const { firstName, lastName } = parseFullName(validatedData.shippingAddress.fullName);

			// 5. Create or retrieve Stripe customer (extracted service)
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
			const skuDetailsResults = await Promise.all(skuIds.map((skuId) => getSkuDetails({ skuId })));

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

			// 7. Build Stripe line items (extracted service)
			const { lineItems, subtotal } = buildStripeLineItems(
				validatedData.cartItems,
				skuDetailsResults,
			);

			// 8. Atomic transaction: verify stock + create order + apply discount
			const orderResult = await prisma.$transaction(async (tx) => {
				// Verify stock with row locking
				for (const cartItem of validatedData.cartItems) {
					const skuResult = skuDetailsResults.find(
						(r) => r.success && r.data?.sku.id === cartItem.skuId,
					);
					if (!skuResult?.success || !skuResult.data) continue;

					const sku = skuResult.data.sku;
					const currentSkuRows = await tx.$queryRaw<
						Array<{
							isActive: boolean;
							inventory: number;
							productTitle: string;
							productStatus: string;
						}>
					>`
					SELECT
						ps."isActive",
						ps.inventory,
						p.title as "productTitle",
						p.status as "productStatus"
					FROM "ProductSku" ps
					INNER JOIN "Product" p ON ps."productId" = p.id
					WHERE ps.id = ${cartItem.skuId}
					FOR UPDATE
				`;

					if (currentSkuRows.length === 0) {
						throw new BusinessError(`Produit introuvable : ${sku.product.title}`);
					}

					const currentSku = currentSkuRows[0]!;
					if (!currentSku.isActive || currentSku.productStatus !== "PUBLIC") {
						throw new BusinessError(`Le produit ${currentSku.productTitle} n'est plus disponible`);
					}
					if (currentSku.inventory < cartItem.quantity) {
						throw new BusinessError(`Stock insuffisant pour ${currentSku.productTitle}`);
					}
				}

				// Generate order number and compute shipping
				const orderNumber = generateOrderNumber();
				const shippingCost = calculateShipping(
					validatedData.shippingAddress.country as ShippingCountry,
					validatedData.shippingAddress.postalCode,
				);

				// Apply discount code atomically
				let discountAmount = 0;
				let appliedDiscountId: string | null = null;
				let appliedDiscountCode: string | null = null;

				if (validatedData.discountCode) {
					const discountRows = await tx.$queryRaw<
						Array<{
							id: string;
							code: string;
							type: string;
							value: number;
							minOrderAmount: number | null;
							maxUsageCount: number | null;
							maxUsagePerUser: number | null;
							usageCount: number;
							startsAt: Date;
							endsAt: Date | null;
							isActive: boolean;
						}>
					>`
					SELECT
						id, code, type, value,
						"minOrderAmount", "maxUsageCount", "maxUsagePerUser",
						"usageCount", "startsAt", "endsAt", "isActive"
					FROM "Discount"
					WHERE code = ${validatedData.discountCode.toUpperCase()}
					AND "deletedAt" IS NULL
					FOR UPDATE
				`;

					if (discountRows.length === 0) {
						throw new BusinessError(DISCOUNT_ERROR_MESSAGES.NOT_FOUND);
					}

					const discount = discountRows[0]!;

					// Read usage counts directly in transaction to prevent race conditions
					// (cached getDiscountUsageCounts could serve stale data)
					let usageCounts: { userCount: number; emailCount: number } | undefined;
					if (discount.maxUsagePerUser) {
						let userCount = 0;
						let emailCount = 0;

						if (userId) {
							userCount = await tx.discountUsage.count({
								where: { discountId: discount.id, userId },
							});
						}
						if (finalEmail) {
							emailCount = await tx.discountUsage.count({
								where: { discountId: discount.id, order: { customerEmail: finalEmail } },
							});
						}

						usageCounts = { userCount, emailCount };
					}

					const eligibility = checkDiscountEligibility(
						{
							id: discount.id,
							code: discount.code,
							type: discount.type as "PERCENTAGE" | "FIXED_AMOUNT",
							value: discount.value,
							minOrderAmount: discount.minOrderAmount,
							maxUsageCount: discount.maxUsageCount,
							maxUsagePerUser: discount.maxUsagePerUser,
							usageCount: discount.usageCount,
							isActive: discount.isActive,
							startsAt: discount.startsAt,
							endsAt: discount.endsAt,
						},
						{
							subtotal,
							userId: userId ?? undefined,
							customerEmail: finalEmail ?? undefined,
						},
						usageCounts,
					);

					if (!eligibility.eligible) {
						throw new BusinessError(eligibility.error ?? "Code promo invalide");
					}

					const cartItemsForDiscount: CartItemForDiscount[] = [];
					for (const cartItem of validatedData.cartItems) {
						const skuResult = skuDetailsResults.find(
							(r) => r.success && r.data?.sku.id === cartItem.skuId,
						);
						if (skuResult?.success && skuResult.data) {
							cartItemsForDiscount.push({
								priceInclTax: skuResult.data.sku.priceInclTax,
								quantity: cartItem.quantity,
								compareAtPrice: skuResult.data.sku.compareAtPrice,
							});
						}
					}

					discountAmount = calculateDiscountWithExclusion({
						type: discount.type as "PERCENTAGE" | "FIXED_AMOUNT",
						value: discount.value,
						cartItems: cartItemsForDiscount,
						excludeSaleItems: true,
					});

					if (discountAmount > 0) {
						const updateResult = await tx.$executeRaw`
						UPDATE "Discount"
						SET "usageCount" = "usageCount" + 1
						WHERE id = ${discount.id}
							AND ("maxUsageCount" IS NULL OR "usageCount" < "maxUsageCount")
					`;
						if (updateResult === 0) {
							throw new BusinessError("Ce code promo a atteint sa limite d'utilisation");
						}
						appliedDiscountId = discount.id;
						appliedDiscountCode = discount.code;
					}
				}

				// Micro-entreprise: TVA non applicable (art. 293 B du CGI)
				const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);
				const taxAmount = 0;
				const total = Math.max(0, subtotalAfterDiscount + shippingCost);

				// Create order
				const newOrder = await tx.order.create({
					data: {
						orderNumber,
						userId,
						subtotal,
						discountAmount,
						shippingCost,
						taxAmount,
						total,
						currency: DEFAULT_CURRENCY,
						customerEmail: finalEmail ?? "",
						customerName: `${firstName} ${lastName}`.trim(),
						shippingFirstName: firstName,
						shippingLastName: lastName,
						shippingAddress1: validatedData.shippingAddress.addressLine1,
						shippingAddress2: validatedData.shippingAddress.addressLine2 ?? null,
						shippingPostalCode: validatedData.shippingAddress.postalCode,
						shippingCity: validatedData.shippingAddress.city,
						shippingCountry: validatedData.shippingAddress.country as ShippingCountry,
						shippingPhone: validatedData.shippingAddress.phoneNumber || "",
						shippingMethod: "STANDARD",
						status: "PENDING",
						paymentStatus: "PENDING",
						fulfillmentStatus: "UNFULFILLED",
					},
				});

				// Create order items
				for (const cartItem of validatedData.cartItems) {
					const skuResult = skuDetailsResults.find(
						(r) => r.success && r.data?.sku.id === cartItem.skuId,
					);
					if (!skuResult?.success || !skuResult.data) continue;

					const sku = skuResult.data.sku;
					const product = sku.product;
					const primaryImage = sku.images.find((img) => img.isPrimary);
					const rawImageUrl = primaryImage?.url ?? sku.images[0]?.url ?? null;
					const imageUrl = getValidImageUrl(rawImageUrl) ?? null;

					await tx.orderItem.create({
						data: {
							orderId: newOrder.id,
							productId: product.id,
							skuId: sku.id,
							productTitle: product.title,
							productDescription: product.description ?? null,
							productImageUrl: imageUrl,
							skuColor: sku.color?.name ?? null,
							skuMaterial: sku.material ?? null,
							skuSize: sku.size ?? null,
							skuImageUrl: imageUrl,
							price: sku.priceInclTax,
							quantity: cartItem.quantity,
						},
					});
				}

				// Record discount usage snapshot
				if (appliedDiscountId && discountAmount > 0) {
					await tx.discountUsage.create({
						data: {
							discountId: appliedDiscountId,
							orderId: newOrder.id,
							userId: userId ?? null,
							discountCode: appliedDiscountCode!,
							amountApplied: discountAmount,
						},
					});
				}

				return { order: newOrder, appliedDiscountId, discountAmount, appliedDiscountCode };
			});

			const {
				order,
				appliedDiscountId,
				discountAmount: orderDiscountAmount,
				appliedDiscountCode: orderDiscountCode,
			} = orderResult;

			if (appliedDiscountId) {
				updateTag(DISCOUNT_CACHE_TAGS.USAGE(appliedDiscountId));
			}

			// 9. Create Stripe coupon if discount applied
			let stripeCouponId: string | undefined;
			if (orderDiscountAmount > 0 && orderDiscountCode) {
				const coupon = await stripe.coupons.create({
					amount_off: orderDiscountAmount,
					currency: DEFAULT_CURRENCY,
					duration: "once",
					name: `Code promo ${orderDiscountCode}`,
				});
				stripeCouponId = coupon.id;
			}

			// 10. Create Stripe checkout session (extracted service)
			let checkoutSession;
			try {
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
					customerEmail: finalEmail ?? "unknown",
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
	});
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
	if (orderDiscountCode) {
		await prisma.discountUsage.deleteMany({ where: { orderId } });
		await prisma.discount.updateMany({
			where: { code: orderDiscountCode, usageCount: { gt: 0 } },
			data: { usageCount: { decrement: 1 } },
		});
	}

	await prisma.order.delete({ where: { id: orderId } });

	if (stripeCouponId) {
		await stripe.coupons.del(stripeCouponId).catch(() => {});
	}
}
