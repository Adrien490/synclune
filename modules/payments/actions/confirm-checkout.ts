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
import { headers } from "next/headers";
import { after } from "next/server";
import { DISCOUNT_CACHE_TAGS } from "@/modules/discounts/constants/cache";
import { parseFullName } from "@/modules/payments/utils/parse-full-name";
import { enrichStripeCustomer } from "@/modules/payments/services/stripe-customer.service";
import { createOrderInTransaction } from "@/modules/payments/services/order-creation.service";
import { buildStripeLineItems } from "@/modules/payments/services/checkout-line-items.service";
import { confirmCheckoutSchema, type ConfirmCheckoutData } from "../schemas/checkout.schema";
import { saveAddressInTransaction } from "@/modules/addresses/services/save-address.service";
import { getUserAddressesInvalidationTags } from "@/modules/addresses/constants/cache";
import { assertStoreOpen } from "@/modules/store-settings/services/store-closure-guard";
import { requireActiveAccountIfAuthenticated } from "@/modules/auth/lib/require-auth";
import { classifyStripeError } from "@/shared/lib/stripe-errors";
import { BusinessError } from "@/shared/lib/actions";
import { logger } from "@/shared/lib/logger";
import { normalizeEmail } from "@/shared/utils/normalize-email";
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

			// 1b. AUTHZ-1 (AM-3) : re-vérifie en DB que le compte est ACTIVE.
			// `initializePayment` posait déjà cette garde avant de créer le PI, mais
			// un compte suspendu/INACTIVE entre le montage de la page et le clic Payer
			// pouvait encore faire créer une commande payée. On rejoue donc la garde
			// ici, avant la création de l'Order (les invités passent — pas de session).
			const accountGate = await requireActiveAccountIfAuthenticated();
			if ("error" in accountGate) {
				return { success: false, error: accountGate.error.message };
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

			span.setAttribute("payment_intent.id", v.paymentIntentId);

			// 3b. Idempotence check — if an order already exists for this PI, return it
			const existingOrder = await prisma.order.findUnique({
				where: { stripePaymentIntentId: v.paymentIntentId },
				select: { id: true, orderNumber: true, total: true },
			});
			if (existingOrder) {
				span.setAttribute("order.id", existingOrder.id);
				span.setAttribute("order.number", existingOrder.orderNumber);
				span.setAttribute("checkout.idempotent_hit", true);
				return {
					success: true,
					orderId: existingOrder.id,
					orderNumber: existingOrder.orderNumber,
					finalAmount: existingOrder.total,
				};
			}

			// 4. Resolve email (normalize so Order.customerEmail and downstream
			// discount per-user counts stay consistent — cf [[CHECKOUT-AUDIT-003]])
			const rawFinalEmail = v.email ?? userEmail;
			if (!rawFinalEmail) {
				return {
					success: false,
					error: userId
						? "Votre adresse email est manquante. Veuillez vous reconnecter."
						: "L'email est requis pour une commande invité.",
				};
			}
			const finalEmail = normalizeEmail(rawFinalEmail);

			const { firstName, lastName } = parseFullName(v.shippingAddress.fullName);

			// 5. Le client Stripe est créé (idempotent par email) et rattaché au
			// PaymentIntent dès `initializePayment`. On l'enrichit avec l'identité de
			// facturation réelle (nom/adresse) à l'étape 9bis, après l'update du PI —
			// best-effort et hors du chemin critique du paiement. Les invités restent
			// B2C (pas de compte → pas d'identifiants entreprise).

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

			span.setAttribute("order.id", order.id);
			span.setAttribute("order.number", order.orderNumber);
			span.setAttribute("checkout.total", order.total);
			span.setAttribute("checkout.item_count", v.cartItems.length);

			if (appliedDiscountId) {
				updateTag(DISCOUNT_CACHE_TAGS.USAGE(appliedDiscountId));
			}

			// 9. Update PI with order metadata (single call, no retrieve race condition)
			let updatedPaymentIntent: Stripe.Response<Stripe.PaymentIntent>;
			try {
				updatedPaymentIntent = await withStripeCircuitBreaker(() =>
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
						await cleanupFailedCheckout(order.id, orderDiscountCode, appliedDiscountId);
						return {
							success: false,
							error: isAlreadySucceeded
								? "Ce paiement a déjà été effectué."
								: "Ce paiement a été annulé. Veuillez recommencer.",
						};
					}
				}
				// Cleanup orphan order on Stripe failure
				await cleanupFailedCheckout(order.id, orderDiscountCode, appliedDiscountId);
				if (stripeError instanceof CircuitBreakerError) {
					return {
						success: false,
						error: "Le service de paiement est temporairement indisponible.",
					};
				}
				throw stripeError;
			}

			// 9bis. Enrich the Stripe customer (created email-only at init) with the
			// real billing identity, now that the order exists and the PI carries the
			// customer id. Deferred post-response via `after()` so it never adds latency
			// before the front confirms the payment. Best-effort — failures are logged.
			const piCustomerId =
				typeof updatedPaymentIntent.customer === "string" ? updatedPaymentIntent.customer : null;
			if (piCustomerId) {
				after(async () => {
					await enrichStripeCustomer(piCustomerId, {
						name: `${firstName} ${lastName}`.trim(),
						address: v.shippingAddress,
						phoneNumber: v.shippingAddress.phoneNumber,
					});
					// Self-heal: backfill User.stripeCustomerId if init created the
					// customer but its DB write failed (transient). The `stripeCustomerId:
					// null` guard makes this a no-op when already set and never clobbers
					// an existing value (the column is @unique).
					if (userId) {
						try {
							await prisma.user.updateMany({
								where: { id: userId, stripeCustomerId: null },
								data: { stripeCustomerId: piCustomerId },
							});
						} catch (e) {
							logger.warn("[STRIPE_CUSTOMER] Failed to backfill User.stripeCustomerId", {
								userId,
								error: e instanceof Error ? e.message : String(e),
							});
						}
					}
				});
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
					getUserAddressesInvalidationTags(userId).forEach((tag) => updateTag(tag));
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
			// BIZ-BUG-007 : les rejets métier de createOrderInTransaction (code promo
			// expiré entre validation panier et paiement, stock insuffisant, produit
			// indisponible, zone non livrée) sont des BusinessError au message
			// actionnable. Les surfacer tels quels au lieu du message générique —
			// sinon le client voit « Une erreur est survenue » sans savoir quoi corriger.
			if (e instanceof BusinessError) {
				logger.info("Checkout rejected (business rule)", {
					service: "checkout",
					reason: e.message,
				});
				return { success: false, error: e.message };
			}
			const { kind, severity, code } = classifyStripeError(e);
			if (severity === "info") {
				// User-facing error (card decline) — keep out of Sentry to avoid on-call noise.
				logger.info("Stripe declined checkout (user)", {
					service: "checkout",
					stripeKind: kind,
					stripeCode: code,
				});
			} else {
				logger.error("Failed to confirm checkout", e, {
					service: "checkout",
					stripeKind: kind,
					stripeCode: code,
				});
			}
			return {
				success: false,
				error: "Une erreur est survenue lors de la validation de la commande.",
			};
		}
	});
}

async function cleanupFailedCheckout(
	orderId: string,
	orderDiscountCode: string | null,
	appliedDiscountId: string | null,
) {
	// ORD-STRIPE-004 : pre-check anti-race. Entre la création de l'order
	// (step 8) et l'échec de `stripe.paymentIntents.update` (step 9), le
	// client peut avoir confirmé son paiement côté front et le webhook
	// `payment_intent.succeeded` peut avoir déjà marqué l'order PAID. Sans
	// ce guard, on hard-delete une commande payée → carte débitée sans
	// trace en DB. On préfère laisser l'order PAID et alerter Sentry pour
	// intervention admin manuelle (refund Stripe ou réconciliation).
	const existing = await prisma.order.findUnique({
		where: { id: orderId },
		select: { paymentStatus: true, stripePaymentIntentId: true },
	});
	if (existing?.paymentStatus === "PAID") {
		Sentry.withScope((scope) => {
			scope.setLevel("error");
			scope.setTag("checkout", "cleanup-aborted-paid");
			scope.setFingerprint(["confirm-checkout", "cleanup-aborted-paid"]);
			scope.setContext("order", {
				orderId,
				stripePaymentIntentId: existing.stripePaymentIntentId,
			});
			Sentry.captureMessage(
				"cleanupFailedCheckout aborted: order already PAID by concurrent webhook",
				"error",
			);
		});
		logger.error(
			"cleanupFailedCheckout aborted: order already PAID by concurrent webhook",
			undefined,
			{
				service: "checkout",
				orderId,
				stripePaymentIntentId: existing.stripePaymentIntentId,
			},
		);
		return;
	}

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
	// Invalidate discount usage cache after rollback so admin views reflect the new count.
	if (appliedDiscountId) {
		updateTag(DISCOUNT_CACHE_TAGS.USAGE(appliedDiscountId));
	}
}
