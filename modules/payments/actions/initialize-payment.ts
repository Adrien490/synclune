"use server";

import { getSession } from "@/modules/auth/lib/get-current-session";
import {
	isVerifiedAdmin,
	requireActiveAccountIfAuthenticated,
} from "@/modules/auth/lib/require-auth";
import {
	getSkuDetails,
	validateCartItemsWithDb,
} from "@/modules/cart/services/sku-validation.service";
import { getOrCreateCartSessionId } from "@/modules/cart/lib/cart-session";
import { getCart } from "@/modules/cart/data/get-cart";
import {
	cartMatchesServerCart,
	CART_PARITY_ERROR,
} from "@/modules/payments/services/cart-parity.service";
import { checkRateLimit, getClientIp } from "@/shared/lib/rate-limit";
import { PAYMENT_LIMITS } from "@/shared/lib/rate-limit-config";
import { buildPaymentRateLimitId } from "@/modules/payments/utils/payment-rate-limit-id";
import { prisma } from "@/shared/lib/prisma";
import { stripe, withStripeCircuitBreaker, CircuitBreakerError } from "@/shared/lib/stripe";
import { DEFAULT_CURRENCY } from "@/shared/constants/currency";
import { calculateShipping } from "@/modules/orders/services/shipping.service";
import type { ShippingCountry } from "@/shared/constants/countries";
import { getOrCreateStripeCustomer } from "@/modules/payments/services/stripe-customer.service";
import { assertStoreOpen } from "@/modules/store-settings/services/store-closure-guard";
import { headers } from "next/headers";
import { classifyStripeError } from "@/shared/lib/stripe-errors";
import { initializePaymentSchema } from "../schemas/checkout.schema";
import { logger } from "@/shared/lib/logger";
import * as Sentry from "@sentry/nextjs";

interface InitializePaymentResult {
	success: true;
	clientSecret: string;
	paymentIntentId: string;
	subtotal: number;
	shipping: number;
	total: number;
	/**
	 * Montant autoritaire d'une commande DÉJÀ liée à ce PaymentIntent, en centimes —
	 * `null` si aucune. Permet au client de se remonter dans l'état « montant
	 * verrouillé » (CHECKOUT-CONSENT-001) après un rechargement de page.
	 *
	 * Sans ça, le rechargement produisait une impasse fermée : la clé d'idempotence
	 * rejoue la réponse d'origine (un PI refusé reste `requires_payment_method`, donc
	 * la garde d'état terminal ne s'applique pas), et cette réponse n'a jamais porté
	 * `metadata.orderId` — le client repartait donc `lockedAmount: null`, dégelait le
	 * formulaire, puis `updatePaymentAmount` répondait « Commande déjà initiée —
	 * actualise la page » avec un bouton « Réessayer » qui rejouait la même séquence.
	 * Audit UI/UX paiement 2026-07-26, F2.
	 */
	boundAmount: number | null;
}

interface InitializePaymentError {
	success: false;
	error: string;
}

export async function initializePayment(
	params: unknown,
): Promise<InitializePaymentResult | InitializePaymentError> {
	return Sentry.startSpan({ name: "action.initializePayment", op: "checkout" }, async (span) => {
		try {
			// Validation de forme en tête — action publique appelée au montage de la
			// page paiement. safeParse direct (pas validateInput) : retour custom
			// InitializePaymentResult, pas un ActionState. L'email reste optionnel
			// (invité pas encore saisi) — la garde « email requis invité » vit dans
			// confirmCheckout.
			const parsed = initializePaymentSchema.safeParse(params);
			if (!parsed.success) {
				return {
					success: false as const,
					error: parsed.error.issues[0]?.message ?? "Données invalides",
				};
			}
			const input = parsed.data;

			const session = await getSession();
			const userId = session?.user.id ?? null;
			const userEmail = session?.user.email ?? null;

			span.setAttribute("checkout.is_guest", !userId);
			span.setAttribute("checkout.item_count", input.cartItems.length);

			// In-memory rate limiting
			const headersList = await headers();
			const sessionId = !userId ? await getOrCreateCartSessionId() : null;
			const ipAddress = await getClientIp(headersList);
			// Identifiant PRÉFIXÉ par l'action (F3) : sans préfixe, ce compteur était le
			// même que celui du panier, des favoris et de la validation de code promo —
			// 15 opérations quelconques suffisaient à bloquer le paiement pour une heure.
			const rateLimitId = buildPaymentRateLimitId("checkout-init", {
				userId,
				sessionId,
				email: input.email,
				ipAddress,
			});

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

			// Block payment if store is closed (admin bypass for live checkout
			// testing — rôle re-vérifié en DB, jamais le cookie seul)
			if (!(await isVerifiedAdmin(session))) {
				const storeCheck = await assertStoreOpen();
				if (storeCheck) {
					return { success: false, error: storeCheck.message };
				}
			}

			// CHECKOUT-CART-PARITY-001 : parité avec le panier serveur, seule base de
			// calcul de `updatePaymentAmount` et `validateDiscountCode`. La garde
			// AUTORITAIRE est celle de `confirmCheckout` (c'est là que se décide ce qui est
			// facturé) ; ici elle sert à échouer au montage plutôt qu'au clic sur Payer,
			// après un formulaire entièrement rempli.
			const serverCart = await getCart();
			if (!serverCart || serverCart.items.length === 0) {
				return { success: false, error: "Panier vide ou introuvable." };
			}
			if (!cartMatchesServerCart(input.cartItems, serverCart.items)) {
				logger.warn("Payment init refused: client cart diverges from server cart", {
					service: "checkout",
					clientLineCount: input.cartItems.length,
					serverLineCount: serverCart.items.length,
				});
				return { success: false, error: CART_PARITY_ERROR };
			}

			// Validate cart items — existence, soft-delete, isActive, produit PUBLIC.
			// ⚠️ `getSkuDetails` ne regarde PAS `inventory` (il ne reçoit pas de
			// quantité) : la garde de stock est celle juste en dessous.
			const skuDetailsResults = await Promise.all(
				input.cartItems.map((item) => getSkuDetails({ skuId: item.skuId })),
			);

			const failedSkus = skuDetailsResults.filter((r) => !r.success);
			if (failedSkus.length > 0) {
				return { success: false, error: "Certains articles ne sont plus disponibles." };
			}

			// CHECKOUT-STOCK-GATE-001 : quantité disponible vs quantité demandée, AVANT
			// de créer le PaymentIntent. Sans cette passe, un SKU à `inventory: 0` mais
			// `isActive: true` traversait `initializePayment` sans un mot : le client
			// remplissait tout le formulaire, le PI était créé, et l'échec ne tombait
			// qu'au `FOR UPDATE` de `order-creation.service.ts` au moment de payer.
			// Une seule requête batch (`fetchSkusForBatchValidation`, profil `checkout`).
			// Ce n'est PAS la garde anti-survente — celle-ci reste le `FOR UPDATE` de la
			// création de commande puis le décrément webhook, seuls à tenir un verrou.
			// C'est un filtre de courtoisie : échouer tôt, avec le bon message.
			const stockValidation = await validateCartItemsWithDb({ items: input.cartItems });
			if (!stockValidation.success) {
				const firstIssue = stockValidation.data?.find((item) => !item.isValid);
				return {
					success: false,
					error: firstIssue?.error ?? "Certains articles ne sont plus disponibles.",
				};
			}

			// Verify prices
			for (const cartItem of input.cartItems) {
				const skuResult = skuDetailsResults.find(
					(r) => r.success && r.data?.sku.id === cartItem.skuId,
				);
				if (!skuResult?.success || !skuResult.data) continue;
				if (cartItem.priceAtAdd !== skuResult.data.sku.priceInclTax) {
					return {
						success: false,
						error: "Les prix de certains articles ont changé. Actualise ton panier.",
					};
				}
			}

			// Calculate subtotal
			const subtotal = input.cartItems.reduce(
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
			const finalEmail = input.email ?? userEmail;
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
			const cartHash = input.cartItems
				.map((i) => `${i.skuId}:${i.quantity}:${i.priceAtAdd}`)
				.sort()
				.join("|");

			// Audit P2.4 : la clé d'idempotence doit refléter TOUS les paramètres
			// mutables du `paymentIntents.create` — sinon réutiliser la même clé avec
			// des paramètres différents fait échouer Stripe (« Keys for idempotent
			// requests can only be used with the same parameters »).
			//  - `ownerKey` : identifiant stable et NON vide (un `null`/`""` partagé
			//    collisionnerait entre invités distincts → fuite de PI cross-guest).
			//  - `customerKey` : un re-init du même panier après ajout d'email attache
			//    un `customer` (param différent) → doit produire une clé différente.
			//  - `total` : un changement de tarif d'expédition FR entre deux inits
			//    change `amount` → doit produire une clé différente.
			const ownerKey = userId ?? sessionId;
			if (!ownerKey) {
				return {
					success: false,
					error: "Session invalide. Actualise la page.",
				};
			}
			const customerKey = stripeCustomerId ?? "anon";
			const idempotencyKey = `pi-init-${ownerKey}-${customerKey}-${total}-${cartHash}`;

			// Create Payment Intent
			// Carte uniquement (décision produit). `payment_method_types: ["card"]`
			// restreint le PI à la carte au niveau serveur — Apple Pay / Google Pay
			// restent disponibles (wallets adossés au type `card`), Link et les
			// méthodes à redirection (SEPA debit, Klarna, Bancontact) sont exclus.
			const createPaymentIntent = (key: string) =>
				withStripeCircuitBreaker(() =>
					stripe.paymentIntents.create(
						{
							amount: total,
							currency: DEFAULT_CURRENCY.toLowerCase(),
							payment_method_types: ["card"],
							...(stripeCustomerId && { customer: stripeCustomerId }),
							metadata: {
								userId: userId ?? "guest",
								...(sessionId && { guestSessionId: sessionId }),
							},
						},
						{ idempotencyKey: key },
					),
				);

			let paymentIntent = await createPaymentIntent(idempotencyKey);

			// CHECKOUT-REPLAY-001 : une clé d'idempotence Stripe rejoue la réponse
			// d'origine pendant 24 h. Si le PI correspondant a été annulé entre-temps
			// (`cancelOrphanPaymentIntent`, déclenché quand un re-init post-inactivité
			// produit un PI différent), revenir au panier initial rejouait un
			// `client_secret` MORT : Elements monte, la confirmation échoue, et
			// « Réessayer » rejoue la même clé → impasse jusqu'à expiration. On
			// détecte l'état terminal et on repart sur une clé salée (déterministe :
			// deux montages concurrents convergent vers le même PI).
			if (paymentIntent.status === "canceled" || paymentIntent.status === "succeeded") {
				logger.warn("Idempotent replay returned a terminal PaymentIntent — creating a fresh one", {
					service: "checkout",
					paymentIntentId: paymentIntent.id,
					paymentIntentStatus: paymentIntent.status,
				});
				paymentIntent = await createPaymentIntent(`${idempotencyKey}-r2`);
			}

			if (!paymentIntent.client_secret) {
				throw new Error("Payment Intent created without client_secret");
			}

			span.setAttribute("payment_intent.id", paymentIntent.id);
			span.setAttribute("checkout.subtotal", subtotal);
			span.setAttribute("checkout.total", total);

			// Une commande est-elle déjà liée à ce PI ? On interroge NOTRE base plutôt
			// que Stripe : `Order.stripePaymentIntentId` est `@unique`, donc c'est un
			// point-read indexé, et surtout `paymentIntent.metadata` est ici la réponse
			// REJOUÉE de la création — elle ne contient jamais l'`orderId` écrit plus tard
			// par `confirmCheckout`. Seule une commande encore PENDING verrouille : une
			// commande PAID a déjà redirigé, une CANCELLED ne doit pas geler le formulaire.
			const boundOrder = await prisma.order.findUnique({
				where: { stripePaymentIntentId: paymentIntent.id },
				select: { total: true, paymentStatus: true },
			});
			const boundAmount =
				boundOrder && boundOrder.paymentStatus === "PENDING" ? boundOrder.total : null;

			if (boundAmount !== null) {
				span.setAttribute("checkout.bound_amount", boundAmount);
			}

			return {
				success: true,
				clientSecret: paymentIntent.client_secret,
				paymentIntentId: paymentIntent.id,
				subtotal,
				shipping,
				total,
				boundAmount,
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
