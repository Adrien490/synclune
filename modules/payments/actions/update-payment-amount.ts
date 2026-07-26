"use server";

import { z } from "zod";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { getOrCreateCartSessionId } from "@/modules/cart/lib/cart-session";
import { getCart } from "@/modules/cart/data/get-cart";
import { getSkuDetails } from "@/modules/cart/services/sku-validation.service";
import { prisma } from "@/shared/lib/prisma";
import { checkDiscountEligibility } from "@/modules/discounts/services/discount-eligibility.service";
import {
	calculateDiscountWithExclusion,
	type CartItemForDiscount,
} from "@/modules/discounts/services/discount-calculation.service";
import { parsePaymentIntentMetadata } from "@/modules/payments/schemas/stripe-metadata.schema";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { PAYMENT_LIMITS } from "@/shared/lib/rate-limit-config";
import { stripe, withStripeCircuitBreaker, CircuitBreakerError } from "@/shared/lib/stripe";
import { calculateShipping, getShippingInfo } from "@/modules/orders/services/shipping.service";
import { SHIPPING_COUNTRIES, type ShippingCountry } from "@/shared/constants/countries";
import { STRIPE_MIN_AMOUNT_EUR_CENTS } from "@/shared/constants/currency";
import { assertStoreOpen } from "@/modules/store-settings/services/store-closure-guard";
import { isVerifiedAdmin } from "@/modules/auth/lib/require-auth";
import { classifyStripeError } from "@/shared/lib/stripe-errors";
import { headers } from "next/headers";
import { logger } from "@/shared/lib/logger";
import * as Sentry from "@sentry/nextjs";

const updatePaymentAmountSchema = z.object({
	paymentIntentId: z.string().startsWith("pi_", "Payment Intent ID invalide"),
	country: z.enum(SHIPPING_COUNTRIES, { message: "Pays de livraison invalide" }),
	postalCode: z.string().max(20).default(""),
	// Audit F1 (2026-07-02) : le client envoie le CODE promo, jamais un montant.
	// La remise est re-dérivée serveur (éligibilité + calcul) plus bas — un
	// `discountAmount` numérique client permettait de minorer arbitrairement le
	// PI provisoire (borné au subtotal seulement).
	discountCode: z.string().trim().max(50).nullable().default(null),
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

			// 2. Store-open guard (admin bypass for live checkout testing —
			// rôle re-vérifié en DB, jamais le cookie seul)
			if (!(await isVerifiedAdmin(session))) {
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

			const { paymentIntentId, country, postalCode, discountCode } = validation.data;
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
			// ⚠️ Garde de PRÉSENCE fail-closed : clé brute, PAS le parse Zod fail-open
			// (un orderId malformé serait droppé et la garde contournée).
			if (pi.metadata.orderId) {
				return {
					success: false,
					error: "Commande déjà initiée — actualisez la page.",
				};
			}

			// Zod boundary : champ malformé droppé → undefined → ownerMatch false (deny)
			const piMetadata = parsePaymentIntentMetadata(pi.metadata, { paymentIntentId });
			const piUserId = piMetadata.userId;
			const piSessionId = piMetadata.guestSessionId;

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

			// 6b. Re-derive the discount server-side from the code (audit F1).
			// Provisional amount only : pas de FOR UPDATE ni de vérif maxUsagePerUser
			// (elle exige l'email de commande, inconnu ici) — le montant AUTORITAIRE
			// est recalculé sous lock par `createOrderInTransaction` à confirmCheckout,
			// qui rejette un code devenu inéligible. Code invalide/expiré → remise 0,
			// sans erreur bloquante : le PI provisoire revient simplement au plein tarif.
			let discountAmount = 0;
			if (discountCode) {
				const discount = await prisma.discount.findFirst({
					where: { code: discountCode.toUpperCase(), deletedAt: null },
					select: {
						id: true,
						code: true,
						type: true,
						value: true,
						minOrderAmount: true,
						maxUsageCount: true,
						maxUsagePerUser: true,
						usageCount: true,
						isActive: true,
						startsAt: true,
						endsAt: true,
					},
				});

				if (discount) {
					const eligibility = checkDiscountEligibility(discount, {
						subtotal,
						userId: userId ?? undefined,
					});

					if (eligibility.eligible) {
						const cartItemsForDiscount: CartItemForDiscount[] = [];
						for (const item of cart.items) {
							const skuResult = skuDetailsResults.find(
								(r) => r.success && r.data?.sku.id === item.sku.id,
							);
							if (!skuResult?.success || !skuResult.data) continue;
							cartItemsForDiscount.push({
								priceInclTax: skuResult.data.sku.priceInclTax,
								quantity: item.quantity,
								compareAtPrice: skuResult.data.sku.compareAtPrice,
							});
						}

						discountAmount = calculateDiscountWithExclusion({
							type: discount.type,
							value: discount.value,
							cartItems: cartItemsForDiscount,
							excludeSaleItems: true,
						});
						discountAmount = Math.max(0, Math.min(discountAmount, subtotal));
					}
				}
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
				// Audit P2.2 — garde TOCTOU. Entre le retrieve de l'étape 5 et ce
				// `update`, `confirmCheckout` (step 9) a pu lier la commande au PI et
				// poser le montant AUTORITAIRE (`order.total`). Même avec la remise
				// re-dérivée serveur (audit F1), écraser le montant maintenant ferait
				// diverger le PI de `order.total` (panier/promo ayant pu changer entre
				// les deux calculs) : le client confirmerait un montant différent. C'est
				// rattrapé en dernier ressort par la garde montant du webhook
				// (checkout-order-processing.service.ts:213) — mais au prix d'une charge
				// erronée + commande bloquée + retries Stripe. On re-vérifie donc juste
				// avant l'update et on refuse si la commande est déjà initiée.
				const fresh = await withStripeCircuitBreaker(() =>
					stripe.paymentIntents.retrieve(paymentIntentId),
				);
				if (fresh.metadata.orderId) {
					return {
						success: false,
						error: "Commande déjà initiée — actualisez la page.",
					};
				}

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
