"use server";

import { getSession } from "@/modules/auth/lib/get-current-session";
import { getSkuDetails } from "@/modules/cart/services/sku-validation.service";
import { getOrCreateCartSessionId } from "@/modules/cart/lib/cart-session";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { PAYMENT_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import { stripe, CircuitBreakerError } from "@/shared/lib/stripe";
import { DEFAULT_CURRENCY } from "@/shared/constants/currency";
import { calculateShipping } from "@/modules/orders/services/shipping.service";
import type { ShippingCountry } from "@/shared/constants/countries";
import { getOrCreateStripeCustomer } from "@/modules/payments/services/stripe-customer.service";
import { headers } from "next/headers";
import { logger } from "@/shared/lib/logger";
import * as Sentry from "@sentry/nextjs";

interface InitializePaymentParams {
	cartItems: Array<{ skuId: string; quantity: number; priceAtAdd: number }>;
	email?: string;
}

interface InitializePaymentResult {
	success: true;
	clientSecret: string;
	paymentIntentId: string;
	subtotal: number;
	shipping: number;
	total: number;
}

interface InitializePaymentError {
	success: false;
	error: string;
}

export async function initializePayment(
	params: InitializePaymentParams,
): Promise<InitializePaymentResult | InitializePaymentError> {
	return Sentry.startSpan({ name: "action.initializePayment", op: "checkout" }, async () => {
		try {
			const session = await getSession();
			const userId = session?.user.id ?? null;
			const userEmail = session?.user.email ?? null;

			// Rate limiting
			const sessionId = !userId ? await getOrCreateCartSessionId() : null;
			const headersList = await headers();
			const ipAddress = await getClientIp(headersList);
			const rateLimitId = userId
				? `user:${userId}`
				: params.email && ipAddress
					? `guest:${params.email.toLowerCase().trim()}:${ipAddress}`
					: getRateLimitIdentifier(null, sessionId ?? null, ipAddress);

			const rateLimit = await checkRateLimit(rateLimitId, PAYMENT_LIMITS.CREATE_SESSION, ipAddress);
			if (!rateLimit.success) {
				return {
					success: false,
					error: rateLimit.error ?? "Trop de tentatives. Veuillez réessayer plus tard.",
				};
			}

			// Validate cart items
			const skuDetailsResults = await Promise.all(
				params.cartItems.map((item) => getSkuDetails({ skuId: item.skuId })),
			);

			const failedSkus = skuDetailsResults.filter((r) => !r.success);
			if (failedSkus.length > 0) {
				return { success: false, error: "Certains articles ne sont plus disponibles." };
			}

			// Verify prices
			for (const cartItem of params.cartItems) {
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

			// Calculate subtotal
			const subtotal = params.cartItems.reduce(
				(sum, item) => sum + item.priceAtAdd * item.quantity,
				0,
			);

			// Default shipping (France Standard)
			const shipping = calculateShipping("FR" as ShippingCountry) ?? 499;
			const total = subtotal + shipping;

			// Get or create Stripe customer
			const finalEmail = params.email ?? userEmail;
			let stripeCustomerId: string | null = null;

			if (userId) {
				const user = await prisma.user.findUnique({
					where: { id: userId },
					select: { stripeCustomerId: true },
				});
				stripeCustomerId = user?.stripeCustomerId ?? null;
			}

			if (finalEmail) {
				const customerResult = await getOrCreateStripeCustomer(stripeCustomerId, {
					email: finalEmail,
					firstName: "",
					lastName: "",
					address: { addressLine1: "", postalCode: "", city: "" },
					userId,
				});
				if (!("error" in customerResult)) {
					stripeCustomerId = customerResult.customerId;
				}
			}

			// Create Payment Intent
			const paymentIntent = await stripe.paymentIntents.create({
				amount: total,
				currency: DEFAULT_CURRENCY.toLowerCase(),
				automatic_payment_methods: { enabled: true },
				...(stripeCustomerId && { customer: stripeCustomerId }),
				metadata: {
					userId: userId ?? "guest",
					...(sessionId && { guestSessionId: sessionId }),
				},
			});

			if (!paymentIntent.client_secret) {
				throw new Error("Payment Intent created without client_secret");
			}

			return {
				success: true,
				clientSecret: paymentIntent.client_secret,
				paymentIntentId: paymentIntent.id,
				subtotal,
				shipping,
				total,
			};
		} catch (e) {
			if (e instanceof CircuitBreakerError) {
				return {
					success: false,
					error: "Le service de paiement est temporairement indisponible.",
				};
			}
			logger.error("Failed to initialize payment", e, { service: "checkout" });
			Sentry.captureException(e);
			return {
				success: false,
				error: "Une erreur est survenue lors de l'initialisation du paiement.",
			};
		}
	});
}
