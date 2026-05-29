"use server";

import { getSession } from "@/modules/auth/lib/get-current-session";
import { requireActiveAccountIfAuthenticated } from "@/modules/auth/lib/require-auth";
import { getSkuDetails } from "@/modules/cart/services/sku-validation.service";
import { getOrCreateCartSessionId } from "@/modules/cart/lib/cart-session";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { PAYMENT_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import { stripe, withStripeCircuitBreaker, CircuitBreakerError } from "@/shared/lib/stripe";
import { DEFAULT_CURRENCY } from "@/shared/constants/currency";
import { calculateShipping } from "@/modules/orders/services/shipping.service";
import type { ShippingCountry } from "@/shared/constants/countries";
import { getOrCreateStripeCustomer } from "@/modules/payments/services/stripe-customer.service";
import { assertStoreOpen } from "@/modules/store-settings/services/store-closure-guard";
import { headers } from "next/headers";
import { classifyStripeError } from "@/shared/lib/stripe-errors";
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
	return Sentry.startSpan({ name: "action.initializePayment", op: "checkout" }, async (span) => {
		try {
			const session = await getSession();
			const userId = session?.user.id ?? null;
			const userEmail = session?.user.email ?? null;

			span.setAttribute("checkout.is_guest", !userId);
			span.setAttribute("checkout.item_count", params.cartItems.length);

			// In-memory rate limiting
			const headersList = await headers();
			const sessionId = !userId ? await getOrCreateCartSessionId() : null;
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

			// AUTHZ-1 : gate pré-paiement. Un invité passe ; une session dont le compte
			// n'est pas ACTIVE (suspendu/INACTIVE/PENDING_DELETION) est rejetée AVANT
			// la création du PaymentIntent → aucun débit orphelin possible. Ferme la
			// fenêtre cookie-cache Better Auth (~5 min) post-suspension.
			const accountGate = await requireActiveAccountIfAuthenticated();
			if ("error" in accountGate) {
				return { success: false, error: accountGate.error.message };
			}

			// Block payment if store is closed (admin bypass for live checkout testing)
			if (session?.user.role !== "ADMIN") {
				const storeCheck = await assertStoreOpen();
				if (storeCheck) {
					return { success: false, error: storeCheck.message };
				}
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

			// Default shipping (France Standard).
			// Throw explicitly if FR has no configured rate so admins notice the misconfiguration
			// rather than silently undercharging the customer (audit P2.5).
			const shipping = calculateShipping("FR" satisfies ShippingCountry);
			if (shipping === null) {
				throw new Error("Default FR shipping rate not configured");
			}
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

			// Generate a stable cart hash for idempotency
			const cartHash = params.cartItems
				.map((i) => `${i.skuId}:${i.quantity}:${i.priceAtAdd}`)
				.sort()
				.join("|");
			const idempotencyKey = `pi-init-${userId ?? sessionId}-${cartHash}`;

			// Create Payment Intent
			// `automatic_payment_methods` with `allow_redirects: "never"` enables
			// card wallets (Apple Pay, Google Pay) + Link while excluding redirect-based
			// methods (SEPA debit, Klarna, Bancontact) that would bypass our checkout UX.
			const paymentIntent = await withStripeCircuitBreaker(() =>
				stripe.paymentIntents.create(
					{
						amount: total,
						currency: DEFAULT_CURRENCY.toLowerCase(),
						automatic_payment_methods: { enabled: true, allow_redirects: "never" },
						...(stripeCustomerId && { customer: stripeCustomerId }),
						metadata: {
							userId: userId ?? "guest",
							...(sessionId && { guestSessionId: sessionId }),
						},
					},
					{ idempotencyKey },
				),
			);

			if (!paymentIntent.client_secret) {
				throw new Error("Payment Intent created without client_secret");
			}

			span.setAttribute("payment_intent.id", paymentIntent.id);
			span.setAttribute("checkout.subtotal", subtotal);
			span.setAttribute("checkout.total", total);

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
			const { kind, severity, code } = classifyStripeError(e);
			if (severity === "info") {
				logger.info("Stripe declined payment init (user)", {
					service: "checkout",
					stripeKind: kind,
					stripeCode: code,
				});
			} else {
				logger.error("Failed to initialize payment", e, {
					service: "checkout",
					stripeKind: kind,
					stripeCode: code,
				});
			}
			return {
				success: false,
				error: "Une erreur est survenue lors de l'initialisation du paiement.",
			};
		}
	});
}
