"use server";

import { redirect } from "next/navigation";
import type Stripe from "stripe";
import { readCartCookie } from "@/modules/cart/lib/cart-cookie";
import { CART_VARIANT_SELECT, MAX_QUANTITY_PER_ORDER } from "@/modules/cart/constants/cart";
import type { CartItemVariant } from "@/modules/cart/types/cart.types";
import { getShippingInfo, parseEstimatedDays } from "@/modules/orders/services/shipping.service";
import { getVariantInvalidationTags } from "@/modules/variants/utils/cache.utils";
import { error, handleActionError, validateInput } from "@/shared/lib/actions";
import { updateTagsAfterMutation } from "@/shared/lib/cache";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { stripe, withStripeCircuitBreaker } from "@/shared/lib/stripe";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { SITE_URL } from "@/shared/constants/seo-config";
import { ROUTES } from "@/shared/constants/urls";
import type { ActionState } from "@/shared/types/server-action";
import { CHECKOUT_SESSION_TTL_SECONDS } from "../constants/checkout.constants";
import { createCheckoutSessionSchema } from "../schemas/checkout.schemas";
import {
	buildOrderLines,
	buildStripeLineItems,
	computeOrderAmounts,
} from "../services/checkout-order.service";
import {
	releaseReservation,
	reserveStockAndCreateOrder,
} from "../services/checkout-reservation.service";

/**
 * Crée une session Stripe Checkout HÉBERGÉE depuis le panier cookie (D4-D5).
 *
 * Séquence — l'ordre garantit « jamais d'Order sans stripeSessionId, jamais de
 * décrément sans Order » :
 *   1. parse de l'entrée (pays de livraison) AVANT toute dérivation ;
 *   2. relecture FRAÎCHE de chaque ligne en base (variante/produit actifs,
 *      stock, prix courant — le `priceAtAdd` du cookie n'est qu'un témoin
 *      d'affichage, aucun montant ne vient du client) ;
 *   3. transaction : décrément atomique du stock + Order PENDING avec
 *      snapshots (placeholder `pending_…` en guise de stripeSessionId) ;
 *   4. création de la session Stripe (price_data inline, eur) ;
 *   5. update du stripeSessionId réel — si 4 ou 5 échoue : rollback
 *      compensatoire (restock + delete Order) ;
 *   6. redirect(session.url) — HORS try/catch (redirect throw en interne).
 *
 * Le panier n'est PAS vidé ici : une session abandonnée doit pouvoir être
 * retentée. Le vidage revient à la page /paiement/retour.
 */
export async function createCheckoutSession(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	const validation = validateInput(createCheckoutSessionSchema, {
		country: formData.get("country"),
	});
	if ("error" in validation) return validation.error;
	const { country } = validation.data;

	// Frais de port fixés par le pays choisi (Corse/DOM-TOM : limite assumée —
	// le code postal n'est connu qu'après coup, cf. rapport du lot 3).
	const shippingInfo = getShippingInfo(country);
	if (!shippingInfo) {
		return error("La livraison n'est pas disponible pour ce pays.");
	}

	// Panier du cookie, matérialisé en DIRECT (jamais via le cache de rendu).
	const cookie = await readCartCookie();
	if (cookie.items.length === 0) {
		return error("Ton panier est vide.");
	}

	const variants = await prisma.productVariant.findMany({
		where: { id: { in: cookie.items.map((item) => item.variantId) } },
		select: CART_VARIANT_SELECT,
	});
	const byVariantId = new Map(variants.map((variant) => [variant.id, variant]));

	const items: Array<{ quantity: number; variant: CartItemVariant }> = [];
	for (const cookieItem of cookie.items) {
		const variant = byVariantId.get(cookieItem.variantId);
		if (!variant || !variant.active || !variant.product.active) {
			return error(
				`« ${variant?.product.name ?? "Un article"} » n'est plus disponible. Mets ton panier à jour.`,
			);
		}
		if (variant.stock < cookieItem.quantity || cookieItem.quantity > MAX_QUANTITY_PER_ORDER) {
			return error(`Stock insuffisant pour « ${variant.product.name} ». Mets ton panier à jour.`);
		}
		items.push({ quantity: cookieItem.quantity, variant });
	}

	const lines = buildOrderLines(items);
	const amounts = computeOrderAmounts(lines, shippingInfo.amount);

	// 3. Réservation atomique (décrément vérifié + Order PENDING).
	let orderId: string;
	try {
		({ orderId } = await reserveStockAndCreateOrder(lines, amounts));
	} catch (e) {
		return handleActionError(e, "Impossible de préparer ta commande. Réessaie.");
	}

	// 4-5. Session Stripe, puis ancrage du stripeSessionId réel.
	const [minDays, maxDays] = parseEstimatedDays(shippingInfo.estimatedDays);
	let sessionUrl: string;
	try {
		const session = await withStripeCircuitBreaker(() =>
			stripe.checkout.sessions.create({
				mode: "payment",
				locale: "fr",
				line_items: buildStripeLineItems(lines),
				shipping_address_collection: {
					allowed_countries: [
						country as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry,
					],
				},
				shipping_options: [
					{
						shipping_rate_data: {
							type: "fixed_amount",
							display_name: shippingInfo.displayName,
							fixed_amount: { amount: shippingInfo.amount, currency: "eur" },
							delivery_estimate: {
								minimum: { unit: "business_day", value: minDays },
								maximum: { unit: "business_day", value: maxDays },
							},
						},
					},
				],
				expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_SESSION_TTL_SECONDS,
				metadata: { orderId },
				client_reference_id: orderId,
				success_url: `${SITE_URL}${ROUTES.SHOP.CHECKOUT_RETURN}?session_id={CHECKOUT_SESSION_ID}`,
				cancel_url: `${SITE_URL}${ROUTES.SHOP.CHECKOUT_CANCEL}`,
			}),
		);

		if (!session.url) {
			throw new Error("Session Checkout créée sans URL de redirection");
		}

		await prisma.order.update({
			where: { id: orderId },
			data: { stripeSessionId: session.id },
		});
		sessionUrl = session.url;
	} catch (e) {
		try {
			await releaseReservation(
				orderId,
				lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
			);
		} catch (rollbackError) {
			// Vestige `pending_…` assumé : la réconciliation admin le résorbera.
			logger.error("[createCheckoutSession] Rollback compensatoire échoué", {
				orderId,
				error: rollbackError,
			});
		}
		logger.error("[createCheckoutSession] Création de session Stripe échouée", {
			orderId,
			error: e,
		});
		return error("Le paiement est indisponible pour le moment. Réessaie dans quelques minutes.");
	}

	// Stock décrémenté → vitrine et admin doivent le voir.
	const tags = new Set<string>([
		SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST,
		SHARED_CACHE_TAGS.ADMIN_BADGES,
	]);
	for (const item of items) {
		for (const tag of getVariantInvalidationTags({
			variantId: item.variant.id,
			productId: item.variant.product.id,
			productSlug: item.variant.product.slug,
		})) {
			tags.add(tag);
		}
	}
	updateTagsAfterMutation(tags);

	// 6. Hors try/catch : redirect() lance une exception interne de Next.
	redirect(sessionUrl);
}
