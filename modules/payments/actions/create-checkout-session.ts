"use server";

import { headers } from "next/headers";
import * as Sentry from "@sentry/nextjs";
import type Stripe from "stripe";

import { getSession } from "@/modules/auth/lib/get-current-session";
import { getOrCreateCartSessionId, getCartSessionId } from "@/modules/cart/lib/cart-session";
import { getSkusDetailsBatch } from "@/modules/cart/services/sku-validation.service";
import { calculateDiscountWithExclusion } from "@/modules/discounts/services/discount-calculation.service";
import { isDiscountCurrentlyValid } from "@/modules/discounts/services/discount-validation.service";
import { assertStoreOpen } from "@/modules/store-settings/services/store-closure-guard";
import { STRIPE_SHIPPING_OPTIONS } from "@/modules/orders/constants/stripe-shipping-rates";
import { getOrCreateStripeCustomer } from "@/modules/payments/services/stripe-customer.service";
import { buildStripeLineItems } from "@/modules/payments/services/checkout-line-items.service";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { PAYMENT_LIMITS } from "@/shared/lib/rate-limit-config";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { SHIPPING_COUNTRIES } from "@/shared/constants/countries";
import { CircuitBreakerError, stripe, withStripeCircuitBreaker } from "@/shared/lib/stripe";
import { classifyStripeError } from "@/shared/lib/stripe-errors";

type StripeSessionCreateParams = Stripe.Checkout.SessionCreateParams;
type StripeLineItem = NonNullable<StripeSessionCreateParams["line_items"]>[number];
type StripeAllowedCountry = NonNullable<
	StripeSessionCreateParams["shipping_address_collection"]
>["allowed_countries"][number];
type StripeShippingOption = NonNullable<StripeSessionCreateParams["shipping_options"]>[number];

/**
 * Durée de vie d'une Checkout Session (Stripe min 30 min).
 * Aligne aussi le « stock-lock implicite » côté Synclune : passé ce délai, le
 * webhook `checkout.session.expired` libère le slot et le stock reste disponible.
 */
const CHECKOUT_SESSION_EXPIRES_IN_SECONDS = 30 * 60;

export interface CreateCheckoutSessionResult {
	success: true;
	clientSecret: string;
	sessionId: string;
}

export interface CreateCheckoutSessionError {
	success: false;
	error: string;
}

/**
 * Crée une Checkout Session Stripe en mode `embedded` à partir du panier courant.
 *
 * Contrairement au flow Elements/PaymentIntent précédent, aucune `Order` Synclune
 * n'est créée à ce stade : seules les références (`cartId`, `userId|guestSessionId`,
 * `discountCode`) sont stockées dans les `metadata` de la Session. Le webhook
 * `checkout.session.completed` est la seule entrée de création d'`Order`.
 */
export async function createCheckoutSession(): Promise<
	CreateCheckoutSessionResult | CreateCheckoutSessionError
> {
	return Sentry.startSpan({ name: "action.createCheckoutSession", op: "checkout" }, async () => {
		try {
			const session = await getSession();
			const userId = session?.user.id ?? null;
			const userEmail = session?.user.email ?? null;

			const headersList = await headers();
			const guestSessionId = !userId ? await getOrCreateCartSessionId() : await getCartSessionId();
			const ipAddress = await getClientIp(headersList);
			const rateLimitId = userId
				? `user:${userId}`
				: getRateLimitIdentifier(null, guestSessionId ?? null, ipAddress);

			const rateLimit = await checkRateLimit(rateLimitId, PAYMENT_LIMITS.CREATE_SESSION, ipAddress);
			if (!rateLimit.success) {
				return {
					success: false,
					error: rateLimit.error ?? "Trop de tentatives. Veuillez réessayer plus tard.",
				};
			}

			if (session?.user.role !== "ADMIN") {
				const storeCheck = await assertStoreOpen();
				if (storeCheck) {
					return { success: false, error: storeCheck.message };
				}
			}

			// Charge le panier en DB pour reconstruire les line_items au prix snapshot.
			const cart = await prisma.cart.findFirst({
				where: {
					...(userId ? { userId } : { sessionId: guestSessionId ?? undefined }),
					OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
				},
				select: {
					id: true,
					updatedAt: true,
					appliedDiscountCode: true,
					discountAmountCache: true,
					items: {
						where: {
							sku: { deletedAt: null, product: { deletedAt: null } },
						},
						select: {
							skuId: true,
							quantity: true,
							priceAtAdd: true,
						},
					},
				},
			});

			if (!cart || cart.items.length === 0) {
				return { success: false, error: "Votre panier est vide." };
			}

			const cartItems = cart.items.map((item) => ({
				skuId: item.skuId,
				quantity: item.quantity,
				priceAtAdd: item.priceAtAdd,
			}));

			// Re-valide tous les SKUs en une seule requête DB (avant: N findUnique parallèles).
			const skuDetailsMap = await getSkusDetailsBatch(cartItems.map((i) => i.skuId));

			for (const cartItem of cartItems) {
				const skuResult = skuDetailsMap.get(cartItem.skuId);
				if (!skuResult?.success || !skuResult.data) {
					return {
						success: false,
						error: skuResult?.error ?? "Certains articles ne sont plus disponibles.",
					};
				}
				if (cartItem.priceAtAdd !== skuResult.data.sku.priceInclTax) {
					return {
						success: false,
						error: "Les prix de certains articles ont changé. Actualisez votre panier.",
					};
				}
			}

			const skuDetailsResults = Array.from(skuDetailsMap.values());
			const { lineItems, subtotal } = buildStripeLineItems(cartItems, skuDetailsResults);

			if (lineItems.length === 0) {
				return { success: false, error: "Votre panier est vide." };
			}

			// Applique le rabais en re-validant le Discount LIVE (le cache `discountAmountCache`
			// est figé à `applyDiscount` ; si un admin a modifié `value`/`isActive`/`endsAt`
			// entre-temps, on doit re-calculer pour ne pas appliquer un montant divergent).
			// Le webhook créera la DiscountUsage en re-validant le code FOR UPDATE.
			let discountAmount = 0;
			let discountCode: string | null = null;
			if (cart.appliedDiscountCode) {
				const liveDiscount = await prisma.discount.findFirst({
					where: { code: cart.appliedDiscountCode, deletedAt: null },
					select: {
						id: true,
						code: true,
						type: true,
						value: true,
						isActive: true,
						startsAt: true,
						endsAt: true,
						minOrderAmount: true,
						maxUsageCount: true,
						maxUsagePerUser: true,
						usageCount: true,
					},
				});

				if (liveDiscount && isDiscountCurrentlyValid(liveDiscount)) {
					const cartItemsForDiscount = cartItems
						.map((item) => {
							const sku = skuDetailsMap.get(item.skuId)?.data?.sku;
							return sku
								? {
										priceInclTax: sku.priceInclTax,
										quantity: item.quantity,
										compareAtPrice: sku.compareAtPrice,
									}
								: null;
						})
						.filter((x): x is NonNullable<typeof x> => x !== null);

					const liveAmount = calculateDiscountWithExclusion({
						type: liveDiscount.type,
						value: liveDiscount.value,
						cartItems: cartItemsForDiscount,
						excludeSaleItems: true,
					});

					if (liveAmount > 0) {
						discountAmount = Math.min(liveAmount, subtotal);
						discountCode = liveDiscount.code;

						if (cart.discountAmountCache !== liveAmount) {
							Sentry.addBreadcrumb({
								category: "checkout",
								message: "discount-cache-drift",
								level: "warning",
								data: {
									code: liveDiscount.code,
									cachedAmount: cart.discountAmountCache ?? 0,
									liveAmount,
								},
							});
						}

						applyDiscountToLineItems(lineItems, subtotal, discountAmount);
					}
				}
			}

			// Récupère ou crée le Stripe Customer. Pour les guests sans email, on laisse
			// Stripe collecter l'email dans l'iframe et créer un Customer plus tard.
			let stripeCustomerId: string | null = null;
			if (userId) {
				const user = await prisma.user.findUnique({
					where: { id: userId },
					select: { stripeCustomerId: true },
				});
				stripeCustomerId = user?.stripeCustomerId ?? null;
			}

			if (userEmail && !stripeCustomerId) {
				const customerResult = await getOrCreateStripeCustomer(stripeCustomerId, {
					email: userEmail,
					firstName: session?.user.name.split(" ")[0] ?? "",
					lastName: session?.user.name.split(" ").slice(1).join(" ") ?? "",
					address: { addressLine1: "", postalCode: "", city: "" },
					userId,
				});
				if (!("error" in customerResult)) {
					stripeCustomerId = customerResult.customerId;
				}
			}

			const baseUrl =
				process.env.NEXT_PUBLIC_APP_URL ?? `https://${headersList.get("host") ?? "synclune.fr"}`;

			const metadata: Record<string, string> = {
				cartId: cart.id,
				userId: userId ?? "guest",
				...(guestSessionId && !userId ? { guestSessionId } : {}),
				...(discountCode ? { discountCode } : {}),
				...(discountAmount > 0 ? { discountAmount: String(discountAmount) } : {}),
			};

			const sessionParams: StripeSessionCreateParams = {
				mode: "payment",
				ui_mode: "embedded_page",
				return_url: `${baseUrl}/paiement/retour?session_id={CHECKOUT_SESSION_ID}`,
				line_items: lineItems,
				expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_SESSION_EXPIRES_IN_SECONDS,
				locale: "fr",
				client_reference_id: cart.id,
				metadata,
				payment_intent_data: {
					metadata,
					statement_descriptor_suffix: "SYNCLUNE",
				},
				shipping_address_collection: {
					allowed_countries:
						SHIPPING_COUNTRIES as readonly StripeAllowedCountry[] as StripeAllowedCountry[],
				},
				shipping_options:
					STRIPE_SHIPPING_OPTIONS as readonly StripeShippingOption[] as StripeShippingOption[],
				phone_number_collection: { enabled: true },
				automatic_tax: { enabled: false },
				billing_address_collection: "auto",
				consent_collection: { terms_of_service: "required" },
				custom_text: {
					terms_of_service_acceptance: {
						message:
							"J'accepte les [conditions générales de vente](https://synclune.fr/cgv) et la politique de retour 14 jours de Synclune.",
					},
				},
				...(stripeCustomerId
					? { customer: stripeCustomerId, customer_update: { address: "auto", name: "auto" } }
					: {
							customer_creation: "always",
							...(userEmail ? { customer_email: userEmail } : {}),
						}),
			};

			// Idempotency : la clé reste stable tant que le panier ne bouge pas.
			// Si un nouvel item est ajouté/retiré, `updatedAt` change → nouvelle Session autorisée.
			const idempotencyKey = `checkout-${cart.id}-${cart.updatedAt.getTime()}`;

			const checkoutSession = await withStripeCircuitBreaker(() =>
				stripe.checkout.sessions.create(sessionParams, { idempotencyKey }),
			);

			if (!checkoutSession.client_secret) {
				throw new Error("Checkout Session created without client_secret");
			}

			Sentry.addBreadcrumb({
				category: "checkout",
				message: "session-created",
				level: "info",
				data: {
					sessionId: checkoutSession.id,
					hasDiscount: Boolean(discountCode),
					itemCount: lineItems.length,
				},
			});

			return {
				success: true,
				clientSecret: checkoutSession.client_secret,
				sessionId: checkoutSession.id,
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
				logger.info("Stripe declined checkout session creation", {
					service: "checkout",
					stripeKind: kind,
					stripeCode: code,
				});
			} else {
				logger.error("Failed to create Checkout Session", e, {
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

/**
 * Distribue `discountAmount` proportionnellement sur les `unit_amount` des
 * line_items, en plafonnant à 0 (Stripe refuse les unit_amount négatifs) et en
 * ajustant le dernier item pour absorber l'erreur d'arrondi.
 */
function applyDiscountToLineItems(
	lineItems: StripeLineItem[],
	subtotal: number,
	discountAmount: number,
): void {
	if (discountAmount <= 0 || subtotal <= 0) return;

	let remaining = discountAmount;
	const lastIndex = lineItems.length - 1;

	lineItems.forEach((item, index) => {
		const priceData = item.price_data;
		if (!priceData || typeof priceData.unit_amount !== "number" || !item.quantity) return;

		const lineTotal = priceData.unit_amount * item.quantity;
		let lineDiscount: number;
		if (index === lastIndex) {
			lineDiscount = remaining;
		} else {
			lineDiscount = Math.floor((lineTotal / subtotal) * discountAmount);
			remaining -= lineDiscount;
		}

		const discountedLineTotal = Math.max(0, lineTotal - lineDiscount);
		priceData.unit_amount = Math.floor(discountedLineTotal / item.quantity);
	});
}
