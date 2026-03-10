"use server";

import { z } from "zod";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { getOrCreateCartSessionId } from "@/modules/cart/lib/cart-session";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { PAYMENT_LIMITS } from "@/shared/lib/rate-limit-config";
import { stripe, withStripeCircuitBreaker, CircuitBreakerError } from "@/shared/lib/stripe";
import { calculateShipping, getShippingInfo } from "@/modules/orders/services/shipping.service";
import { SHIPPING_COUNTRIES, type ShippingCountry } from "@/shared/constants/countries";
import { ajPayment } from "@/shared/lib/arcjet";
import { getBaseUrl } from "@/shared/constants/urls";
import { headers } from "next/headers";
import { logger } from "@/shared/lib/logger";

const updatePaymentAmountSchema = z.object({
	paymentIntentId: z.string().startsWith("pi_", "Payment Intent ID invalide"),
	subtotal: z.number().int().nonnegative("Le sous-total doit être positif"),
	country: z.enum(SHIPPING_COUNTRIES, { message: "Pays de livraison invalide" }),
	postalCode: z.string().max(20).default(""),
	discountAmount: z.number().int().nonnegative("Le montant de réduction doit être positif"),
});

interface UpdatePaymentAmountResult {
	success: true;
	newTotal: number;
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
	try {
		// 1. Auth check
		const session = await getSession();
		const userId = session?.user.id ?? null;
		const sessionId = !userId ? await getOrCreateCartSessionId() : null;

		if (!userId && !sessionId) {
			return { success: false, error: "Session invalide." };
		}

		// 2a. Arcjet: distributed rate limiting + shield + bot detection
		const headersList = await headers();
		const arcjetRequest = new Request(`${getBaseUrl()}/payment/update-amount`, {
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

		// 3. Validate input
		const validation = updatePaymentAmountSchema.safeParse(params);
		if (!validation.success) {
			return { success: false, error: validation.error.issues[0]?.message ?? "Données invalides" };
		}

		const { paymentIntentId, subtotal, country, postalCode, discountAmount } = validation.data;

		// 4. Validate discountAmount does not exceed subtotal
		if (discountAmount > subtotal) {
			return {
				success: false,
				error: "Le montant de réduction ne peut pas dépasser le sous-total.",
			};
		}

		// 5. Verify PI ownership via metadata
		const pi = await withStripeCircuitBreaker(() =>
			stripe.paymentIntents.retrieve(paymentIntentId),
		);
		const piUserId = pi.metadata.userId;
		const piSessionId = pi.metadata.guestSessionId;

		const ownerMatch =
			(userId && piUserId === userId) ?? (!userId && sessionId && piSessionId === sessionId);

		if (!ownerMatch) {
			return { success: false, error: "Accès non autorisé au paiement." };
		}

		// 6. Calculate shipping and total
		const shippingRaw = calculateShipping(country as ShippingCountry, postalCode);
		const shippingUnavailable = shippingRaw === null;
		const shipping = shippingRaw ?? 0;
		const shippingInfo = getShippingInfo(country as ShippingCountry, postalCode);

		const MIN_STRIPE_AMOUNT = 50; // 0.50€ minimum Stripe EUR
		const newTotal = Math.max(MIN_STRIPE_AMOUNT, subtotal - discountAmount + shipping);

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
			shipping,
			shippingUnavailable,
			shippingInfo,
		};
	} catch (e) {
		if (e instanceof CircuitBreakerError) {
			return { success: false, error: "Service de paiement temporairement indisponible." };
		}
		logger.error("Failed to update payment amount", e, { service: "checkout" });
		return { success: false, error: "Erreur lors de la mise à jour du montant." };
	}
}
