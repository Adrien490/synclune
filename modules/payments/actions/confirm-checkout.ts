"use server";

import { Prisma } from "@/app/generated/prisma/client";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { getSkuDetails } from "@/modules/cart/services/sku-validation.service";
import { acquireOrderPaidLockTx } from "@/modules/orders/utils/order-paid-lock";
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
import { releaseOrderDiscountUsageTx } from "@/modules/discounts/services/release-order-discount-usage.service";
import { parseFullName } from "@/modules/payments/utils/parse-full-name";
import { parsePaymentIntentMetadata } from "@/modules/payments/schemas/stripe-metadata.schema";
import { enrichStripeCustomer } from "@/modules/payments/services/stripe-customer.service";
import { createOrderInTransaction } from "@/modules/payments/services/order-creation.service";
import { buildStripeLineItems } from "@/modules/payments/services/checkout-line-items.service";
import { confirmCheckoutSchema, type ConfirmCheckoutData } from "../schemas/checkout.schema";
import { saveAddressInTransaction } from "@/modules/addresses/services/save-address.service";
import { getUserAddressesInvalidationTags } from "@/modules/addresses/constants/cache";
import { assertStoreOpen } from "@/modules/store-settings/services/store-closure-guard";
import {
	isVerifiedAdmin,
	requireActiveAccountIfAuthenticated,
} from "@/modules/auth/lib/require-auth";
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
				select: IDEMPOTENT_ORDER_SELECT,
			});
			if (existingOrder) {
				return resolveIdempotentHit(existingOrder, v, span);
			}

			// 3c. CHECKOUT-IDOR-001 — ownership du PaymentIntent.
			// Sans cette garde, `confirmCheckout` liait une commande à N'IMPORTE quel
			// `pi_…` fourni par le client et écrasait son `amount` / `receipt_email` /
			// `metadata` (étape 9). Un attaquant connaissant le PI d'une victime
			// (préfixe de son `client_secret`) créait sa propre commande sur ce PI :
			// la victime payait le panier de l'attaquant, et le webhook marquait la
			// commande de l'ATTAQUANT payée puis expédiée à son adresse. Aucune garde
			// aval ne rattrape (montant et devise concordent avec l'Order qu'on vient
			// d'écrire). Même contrôle que `updatePaymentAmount` et
			// `cancelOrphanPaymentIntent`, qui le documentent déjà comme garde IDOR.
			let pi: Stripe.Response<Stripe.PaymentIntent>;
			try {
				pi = await withStripeCircuitBreaker(() =>
					stripe.paymentIntents.retrieve(v.paymentIntentId),
				);
			} catch (retrieveError) {
				if (retrieveError instanceof CircuitBreakerError) {
					return {
						success: false,
						error: "Le service de paiement est temporairement indisponible.",
					};
				}
				if (
					retrieveError instanceof Stripe.errors.StripeInvalidRequestError &&
					retrieveError.code === "resource_missing"
				) {
					return {
						success: false,
						error: "Session de paiement introuvable. Actualise la page pour recommencer.",
					};
				}
				throw retrieveError;
			}

			// Une commande est déjà liée à ce PI côté Stripe alors que le pre-check
			// idempotent (3b) n'en a trouvé aucune en DB → PI d'un tiers. Garde de
			// PRÉSENCE fail-closed sur la clé BRUTE, pas le parse Zod fail-open (un
			// orderId malformé serait droppé et la garde contournée).
			if (pi.metadata.orderId) {
				return { success: false, error: "Commande déjà initiée — actualise la page." };
			}

			// Zod boundary : champ malformé droppé → undefined → ownerMatch false (deny)
			const piMetadata = parsePaymentIntentMetadata(pi.metadata, {
				paymentIntentId: v.paymentIntentId,
			});
			const ownerMatch =
				(userId !== null && piMetadata.userId === userId) ||
				(userId === null && sessionId !== null && piMetadata.guestSessionId === sessionId);

			if (!ownerMatch) {
				return { success: false, error: "Accès non autorisé au paiement." };
			}

			// État terminal détecté AVANT la création de la commande : l'étape 9 le
			// rattrapait déjà (via l'erreur Stripe de l'update) mais au prix d'une
			// commande créée puis hard-delete par `cleanupFailedCheckout`, avec
			// rollback du `usageCount` promo. Le catch de l'étape 9 reste nécessaire
			// pour la fenêtre de course entre ce retrieve et l'update.
			if (pi.status === "succeeded") {
				return { success: false, error: "Ce paiement a déjà été effectué." };
			}
			if (pi.status === "canceled") {
				return { success: false, error: "Ce paiement a été annulé. Recommence." };
			}

			// 4. Resolve email (normalize so Order.customerEmail and downstream
			// discount per-user counts stay consistent — cf [[CHECKOUT-AUDIT-003]])
			const rawFinalEmail = v.email ?? userEmail;
			if (!rawFinalEmail) {
				return {
					success: false,
					error: userId
						? "Ton adresse email est manquante. Reconnecte-toi."
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
						error: "Les prix de certains articles ont changé. Actualise ton panier.",
					};
				}
			}

			// 7. Build line items for subtotal
			const { subtotal } = buildStripeLineItems(v.cartItems, skuDetailsResults);

			// 8. Create order in transaction
			let orderResult: Awaited<ReturnType<typeof createOrderInTransaction>>;
			try {
				orderResult = await createOrderInTransaction({
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
			} catch (createError) {
				// CHECKOUT-IDEM-002 : le pre-check idempotence (step 3b) n'est pas
				// atomique avec le create — deux confirmCheckout concurrents (double
				// clic, retry réseau) font que le perdant prend un P2002 sur
				// `stripePaymentIntentId`. On le résout en hit idempotent (même shape
				// que le pre-check) au lieu de l'erreur générique. Si le re-fetch ne
				// trouve rien (P2002 d'une autre contrainte, ex. orderNumber), on
				// laisse remonter au catch global.
				if (
					createError instanceof Prisma.PrismaClientKnownRequestError &&
					createError.code === "P2002"
				) {
					const winner = await prisma.order.findUnique({
						where: { stripePaymentIntentId: v.paymentIntentId },
						select: IDEMPOTENT_ORDER_SELECT,
					});
					if (winner) {
						return resolveIdempotentHit(winner, v, span);
					}
				}
				throw createError;
			}

			const { order, appliedDiscountId } = orderResult;

			span.setAttribute("order.id", order.id);
			span.setAttribute("order.number", order.orderNumber);
			span.setAttribute("checkout.total", order.total);
			span.setAttribute("checkout.item_count", v.cartItems.length);

			if (appliedDiscountId) {
				updateTag(DISCOUNT_CACHE_TAGS.USAGE(appliedDiscountId));
			}

			// 8bis. CHECKOUT-CONSENT-002 — garde de consentement sur le chemin PRIMAIRE.
			// `resolveIdempotentHit` refusait déjà de faire payer plus que le montant
			// affiché, mais uniquement sur un hit idempotent : la première passe
			// posait `order.total` sur le PI sans jamais le comparer à
			// `displayedTotal`. Or `createOrderInTransaction` ne lève PAS toujours
			// quand la remise s'évapore — un code encore ÉLIGIBLE dont le montant
			// retombe à 0 (ex. tous les articles du panier passés en solde entre
			// l'affichage et le clic : `excludeSaleItems` exclut alors tout, donc
			// `eligibleSubtotal = 0`) produit `discountAmount = 0` sans erreur. Le
			// client était alors débité du plein tarif alors que son CTA affichait le
			// total remisé, et le garde webhook ne rejette que la SOUS-facturation.
			if (typeof v.displayedTotal === "number" && order.total > v.displayedTotal) {
				await cleanupFailedCheckout(order.id);
				Sentry.withScope((scope) => {
					scope.setLevel("warning");
					scope.setTag("checkout", "primary-overcharge-refused");
					scope.setFingerprint(["confirm-checkout", "primary-overcharge-refused"]);
					// Aucune PII : uniquement des montants.
					scope.setContext("checkout", {
						orderTotal: order.total,
						displayedTotal: v.displayedTotal,
						discountApplied: appliedDiscountId !== null,
					});
					Sentry.captureMessage(
						"confirmCheckout: primary pass refused — order total exceeds the amount displayed to the customer",
						"warning",
					);
				});
				logger.warn("Checkout refused: order total exceeds displayed total", {
					service: "checkout",
					orderTotal: order.total,
					displayedTotal: v.displayedTotal,
				});
				return { success: false, error: CHECKOUT_DIVERGENCE_ERROR };
			}

			// 9. Update PI with the authoritative amount + order metadata.
			// Le `retrieve` d'ownership de l'étape 3c ne rend pas cette séquence
			// atomique : le PI peut passer en `succeeded`/`canceled` entre les deux
			// (confirmation concurrente dans un autre onglet). Le catch ci-dessous
			// reste donc le filet de la course, l'étape 3c évitant seulement le
			// create-puis-hard-delete dans le cas déjà terminal à l'entrée.
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
						await cleanupFailedCheckout(order.id);
						return {
							success: false,
							error: isAlreadySucceeded
								? "Ce paiement a déjà été effectué."
								: "Ce paiement a été annulé. Recommence.",
						};
					}
				}
				// Cleanup orphan order on Stripe failure
				await cleanupFailedCheckout(order.id);
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

const IDEMPOTENT_ORDER_SELECT = {
	id: true,
	orderNumber: true,
	total: true,
	shippingCountry: true,
	shippingPostalCode: true,
	items: { select: { skuId: true, quantity: true } },
} as const satisfies Prisma.OrderSelect;

type IdempotentOrder = Prisma.OrderGetPayload<{ select: typeof IDEMPOTENT_ORDER_SELECT }>;

const CHECKOUT_DIVERGENCE_ERROR =
	"Ta commande a déjà été initiée avec d'autres informations. Actualise la page pour repartir d'un montant à jour.";

function buildItemsFingerprint(items: Array<{ skuId: string; quantity: number }>): string {
	return items
		.map((item) => `${item.skuId}:${item.quantity}`)
		.sort()
		.join("|");
}

function normalizePostalCode(postalCode: string): string {
	return postalCode.trim().toUpperCase();
}

/**
 * CHECKOUT-CONSENT-001 — résolution d'un hit idempotent (même PaymentIntent).
 *
 * Une fois la commande liée au PI, le montant est FIGÉ : `updatePaymentAmount`
 * refuse toute mise à jour (`metadata.orderId` présent) et le PI porte déjà
 * `order.total`. Or le récapitulatif et le CTA continuaient de refléter les
 * modifications faites après un premier échec de paiement (code promo saisi
 * après un refus de carte, changement de pays). Renvoyer l'ancienne commande
 * telle quelle faisait alors payer un montant différent de celui affiché — et
 * expédier au snapshot d'adresse figé, pas à la nouvelle adresse.
 *
 * Deux gardes, toutes deux fail-closed dans le sens défavorable au client :
 *  1. **Structurelle** : lignes de commande + destination (pays/code postal)
 *     doivent correspondre au snapshot de la commande existante.
 *  2. **Consentement** : si le client déclare le montant affiché à l'écran
 *     (`displayedTotal`) et que `order.total` lui est SUPÉRIEUR, on refuse —
 *     jamais de débit supérieur à ce qui est affiché. L'écart inverse (on
 *     encaisse moins qu'affiché) ne lèse pas le client : on loggue et on
 *     poursuit, plutôt que de bloquer un paiement légitime.
 *
 * Un double-clic ou un retry réseau resoumet exactement les mêmes données →
 * hit idempotent inchangé. Un rechargement de page repart d'un affichage
 * cohérent avec `order.total`, donc débloque toujours le client.
 */
function resolveIdempotentHit(
	order: IdempotentOrder,
	v: ConfirmCheckoutData,
	span: { setAttribute: (key: string, value: string | number | boolean) => void },
): ConfirmCheckoutResult | ConfirmCheckoutError {
	const itemsDiverge = buildItemsFingerprint(v.cartItems) !== buildItemsFingerprint(order.items);
	// ⚠️ Ne compare QUE le pays et le code postal — ce qui suffit pour le montant
	// (le tarif d'expédition n'en dépend que de ça), mais pas pour la destination :
	// une resoumission qui corrige `addressLine1`/`city` est ACCEPTÉE alors que la
	// commande garde son snapshot figé, donc le colis part à l'ancienne rue sans
	// aucun signal. @see docs/KNOWN-ISSUES.md — KI-001
	const destinationDiverges =
		order.shippingCountry !== v.shippingAddress.country ||
		normalizePostalCode(order.shippingPostalCode) !==
			normalizePostalCode(v.shippingAddress.postalCode);
	const wouldOvercharge = typeof v.displayedTotal === "number" && order.total > v.displayedTotal;

	if (itemsDiverge || destinationDiverges || wouldOvercharge) {
		Sentry.withScope((scope) => {
			scope.setLevel("warning");
			scope.setTag("checkout", "idempotent-divergence");
			scope.setFingerprint(["confirm-checkout", "idempotent-divergence"]);
			// Aucune PII : uniquement des booléens et des montants.
			scope.setContext("checkout", {
				orderId: order.id,
				orderTotal: order.total,
				displayedTotal: v.displayedTotal ?? null,
				itemsDiverge,
				destinationDiverges,
				wouldOvercharge,
			});
			Sentry.captureMessage(
				"confirmCheckout: idempotent hit refused — resubmitted data diverges from the bound order",
				"warning",
			);
		});
		logger.warn("Checkout idempotent hit refused (divergence)", {
			service: "checkout",
			orderId: order.id,
			itemsDiverge,
			destinationDiverges,
			wouldOvercharge,
		});
		return { success: false, error: CHECKOUT_DIVERGENCE_ERROR };
	}

	if (typeof v.displayedTotal === "number" && order.total < v.displayedTotal) {
		// Sous-facturation par rapport à l'affichage : le client paie moins que ce
		// qu'il voit. Aucun préjudice pour lui, on n'interrompt pas le paiement.
		logger.warn("Checkout idempotent hit charges less than displayed", {
			service: "checkout",
			orderId: order.id,
			orderTotal: order.total,
			displayedTotal: v.displayedTotal,
		});
	}

	span.setAttribute("order.id", order.id);
	span.setAttribute("order.number", order.orderNumber);
	span.setAttribute("checkout.idempotent_hit", true);
	return {
		success: true,
		orderId: order.id,
		orderNumber: order.orderNumber,
		finalAmount: order.total,
	};
}

async function cleanupFailedCheckout(orderId: string) {
	// ORD-STRIPE-004 : pre-check anti-race (fast path). Entre la création de
	// l'order (step 8) et l'échec de `stripe.paymentIntents.update` (step 9), le
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
		reportCleanupAbortedPaid(orderId, existing.stripePaymentIntentId);
		return;
	}

	// CHECKOUT-RACE-004 : le pre-check ci-dessus n'est PAS atomique avec le
	// delete — le webhook peut flipper PAID (et décrémenter le stock) entre les
	// deux. On sérialise donc la suppression sur le MÊME advisory lock que
	// `processOrderAtomically`/`markAsPaid` (acquireOrderPaidLockTx) et on
	// re-vérifie le statut SOUS le verrou. Issues de la course : le webhook
	// gagne → abort + Sentry (commande PAID conservée) ; le cleanup gagne → le
	// webhook ne résout aucun order (metadata PI sans orderId puisque l'update
	// a échoué) → chemin orphan-charge ORD-STRIPE-010 → auto-refund. Les deux
	// issues sont sûres.
	const outcome = await prisma.$transaction(async (tx) => {
		await acquireOrderPaidLockTx(tx, orderId);
		const fresh = await tx.order.findUnique({
			where: { id: orderId },
			select: { paymentStatus: true, stripePaymentIntentId: true },
		});
		if (!fresh) {
			// Déjà supprimée (cleanup concurrent) — rien à faire.
			return {
				deleted: false,
				paidRace: false,
				stripePaymentIntentId: null,
				releasedDiscountIds: [] as string[],
			};
		}
		if (fresh.paymentStatus === "PAID") {
			return {
				deleted: false,
				paidRace: true,
				stripePaymentIntentId: fresh.stripePaymentIntentId,
				releasedDiscountIds: [] as string[],
			};
		}
		// [[DISC-USAGE-002]] Libération par `orderId` via le service canonique.
		// L'ancien décrément matchait le `code` du discount, ce qui rate la ligne
		// (donc laisse `usageCount` gonflé) si un admin renomme le code entre la
		// création de la commande et ce rollback.
		const releasedDiscountIds = await releaseOrderDiscountUsageTx(tx, orderId);
		await tx.order.delete({ where: { id: orderId } });
		return { deleted: true, paidRace: false, stripePaymentIntentId: null, releasedDiscountIds };
	});

	if (outcome.paidRace) {
		reportCleanupAbortedPaid(orderId, outcome.stripePaymentIntentId);
		return;
	}
	// Invalidate discount usage cache after rollback so admin views reflect the new count.
	if (outcome.deleted) {
		for (const discountId of outcome.releasedDiscountIds) {
			updateTag(DISCOUNT_CACHE_TAGS.USAGE(discountId));
		}
	}
}

function reportCleanupAbortedPaid(orderId: string, stripePaymentIntentId: string | null) {
	Sentry.withScope((scope) => {
		scope.setLevel("error");
		scope.setTag("checkout", "cleanup-aborted-paid");
		scope.setFingerprint(["confirm-checkout", "cleanup-aborted-paid"]);
		scope.setContext("order", {
			orderId,
			stripePaymentIntentId,
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
			stripePaymentIntentId,
		},
	);
}
