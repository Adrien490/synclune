"use server";

import { z } from "zod";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { getOrCreateCartSessionId } from "@/modules/cart/lib/cart-session";
import { getCart } from "@/modules/cart/data/get-cart";
import { getSkuDetails } from "@/modules/cart/services/sku-validation.service";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { PAYMENT_LIMITS } from "@/shared/lib/rate-limit-config";
import { stripe, withStripeCircuitBreaker, CircuitBreakerError } from "@/shared/lib/stripe";
import { calculateShipping, getShippingInfo } from "@/modules/orders/services/shipping.service";
import { SHIPPING_COUNTRIES, type ShippingCountry } from "@/shared/constants/countries";
import { STRIPE_MIN_AMOUNT_EUR_CENTS } from "@/shared/constants/currency";
import { assertStoreOpen } from "@/modules/store-settings/services/store-closure-guard";
import { classifyStripeError } from "@/shared/lib/stripe-errors";
import { headers } from "next/headers";
import { logger } from "@/shared/lib/logger";
import * as Sentry from "@sentry/nextjs";

const updatePaymentAmountSchema = z.object({
	paymentIntentId: z.string().startsWith("pi_", "Payment Intent ID invalide"),
	country: z.enum(SHIPPING_COUNTRIES, { message: "Pays de livraison invalide" }),
	postalCode: z.string().max(20).default(""),
	discountAmount: z.number().int().nonnegative("Le montant de réduction ne peut pas être négatif"),
});

interface UpdatePaymentAmountResult {
	success: true;
	newTotal: number;
	subtotal: number;
	shipping: number;
	shippingUnavailable: boolean;
	shippingInfo: ReturnType<typeof getShippingInfo>;
}

interface UpdatePaymentAmountError {
	success: false;
	error: string;
}

export async function updatePaymentAmount(
	params: unknown,
): Promise<UpdatePaymentAmountResult | UpdatePaymentAmountError> {
	return Sentry.startSpan({ name: "action.updatePaymentAmount", op: "checkout" }, async (span) => {
		try {
			// 1. Auth + session resolution
			const session = await getSession();
			const userId = session?.user.id ?? null;
			const sessionId = !userId ? await getOrCreateCartSessionId() : null;

			if (!userId && !sessionId) {
				return { success: false, error: "Session invalide." };
			}

			// 2. Store-open guard (admin bypass for live checkout testing)
			if (session?.user.role !== "ADMIN") {
				const storeCheck = await assertStoreOpen();
				if (storeCheck) {
					return { success: false, error: storeCheck.message };
				}
			}

			// 3. In-memory rate limiting
			const headersList = await headers();
			const ipAddress = await getClientIp(headersList);
			const rateLimitId = userId
				? `update-amount:user:${userId}`
				: getRateLimitIdentifier(null, sessionId ?? null, ipAddress);

			const rateLimit = await checkRateLimit(rateLimitId, PAYMENT_LIMITS.UPDATE_AMOUNT, ipAddress);
			if (!rateLimit.success) {
				return {
					success: false,
					error: rateLimit.error ?? "Trop de tentatives. Veuillez réessayer plus tard.",
				};
			}

			// 4. Validate input
			const validation = updatePaymentAmountSchema.safeParse(params);
			if (!validation.success) {
				return {
					success: false,
					error: validation.error.issues[0]?.message ?? "Données invalides",
				};
			}

			const { paymentIntentId, country, postalCode, discountAmount } = validation.data;
			span.setAttribute("payment_intent.id", paymentIntentId);
			span.setAttribute("checkout.is_guest", !userId);
			span.setAttribute("shipping.country", country);

			// 5. Verify PI ownership via metadata
			const pi = await withStripeCircuitBreaker(() =>
				stripe.paymentIntents.retrieve(paymentIntentId),
			);

			// 5a. Refuse update once an order is bound to the PI.
			// confirmCheckout already set the authoritative amount; allowing client mutation
			// here would enable underbilling (audit P0.1, 2026-05-11).
			if (pi.metadata.orderId) {
				return {
					success: false,
					error: "Commande déjà initiée — actualisez la page.",
				};
			}

			const piUserId = pi.metadata.userId;
			const piSessionId = pi.metadata.guestSessionId;

			const ownerMatch =
				(userId !== null && piUserId === userId) ||
				(userId === null && sessionId !== null && piSessionId === sessionId);

			if (!ownerMatch) {
				return { success: false, error: "Accès non autorisé au paiement." };
			}

			// 6. Recompute subtotal server-side from the authenticated cart.
			// Never trust a client-supplied subtotal (audit P0.1).
			const cart = await getCart();
			if (!cart || cart.items.length === 0) {
				return { success: false, error: "Panier vide ou introuvable." };
			}

			const skuDetailsResults = await Promise.all(
				cart.items.map((item) => getSkuDetails({ skuId: item.sku.id })),
			);

			if (skuDetailsResults.some((r) => !r.success)) {
				return { success: false, error: "Certains articles ne sont plus disponibles." };
			}

			let subtotal = 0;
			for (const item of cart.items) {
				const skuResult = skuDetailsResults.find(
					(r) => r.success && r.data?.sku.id === item.sku.id,
				);
				if (!skuResult?.success || !skuResult.data) continue;
				if (item.priceAtAdd !== skuResult.data.sku.priceInclTax) {
					return {
						success: false,
						error: "Les prix de certains articles ont changé. Actualisez votre panier.",
					};
				}
				subtotal += item.priceAtAdd * item.quantity;
			}

			if (discountAmount > subtotal) {
				return {
					success: false,
					error: "Le montant de réduction ne peut pas dépasser le sous-total.",
				};
			}

			// 7. Calculate shipping and final total
			const shippingRaw = calculateShipping(country as ShippingCountry, postalCode);
			const shippingUnavailable = shippingRaw === null;
			const shipping = shippingRaw ?? 0;
			const shippingInfo = getShippingInfo(country as ShippingCountry, postalCode);

			const newTotal = Math.max(STRIPE_MIN_AMOUNT_EUR_CENTS, subtotal - discountAmount + shipping);

			span.setAttribute("checkout.subtotal", subtotal);
			span.setAttribute("checkout.total", newTotal);
			span.setAttribute("checkout.has_postal_code", postalCode.length > 0);

			if (!shippingUnavailable) {
				await withStripeCircuitBreaker(() =>
					stripe.paymentIntents.update(paymentIntentId, {
						amount: newTotal,
					}),
				);
			}

			return {
				success: true,
				newTotal,
				subtotal,
				shipping,
				shippingUnavailable,
				shippingInfo,
			};
		} catch (e) {
			if (e instanceof CircuitBreakerError) {
				return { success: false, error: "Service de paiement temporairement indisponible." };
			}
			const { kind, severity, code } = classifyStripeError(e);
			if (severity === "info") {
				logger.info("Stripe declined amount update (user)", {
					service: "checkout",
					stripeKind: kind,
					stripeCode: code,
				});
			} else {
				logger.error("Failed to update payment amount", e, {
					service: "checkout",
					stripeKind: kind,
					stripeCode: code,
				});
			}
			return { success: false, error: "Erreur lors de la mise à jour du montant." };
		}
	});
}
