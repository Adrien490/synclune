/**
 * Constructeurs PURS du checkout : lignes de commande (snapshots), montants,
 * line items Stripe. Aucun effet de bord — testés unitairement.
 */

import type Stripe from "stripe";

/** Ligne du panier matérialisée, telle que l'action la relit en base. */
export interface CheckoutCartItem {
	quantity: number;
	variant: {
		id: string;
		size: string | null;
		/** Override — null = prix du produit. */
		priceCents: number | null;
		color: { name: string } | null;
		material: { name: string } | null;
		product: {
			id: string;
			name: string;
			priceCents: number;
			/** Famille « vignette unique » : première IMAGE ou rien. */
			media: Array<{ url: string }>;
		};
	};
}

/** Ligne de commande prête à écrire (snapshots figés au checkout). */
export interface CheckoutOrderLine {
	variantId: string;
	productId: string;
	nameSnapshot: string;
	variantSnapshot: string | null;
	unitPriceCents: number;
	quantity: number;
	/** Hors snapshot — sert au line item Stripe uniquement. */
	imageUrl: string | null;
}

/**
 * Libellé de variante figé dans `OrderItem.variantSnapshot` : les axes non
 * null, joints par « · » — ex. « Rose bonbon · 18cm · Acier inoxydable ».
 * Une variante sans aucun axe rend `null` (produit à variante unique).
 */
export function buildVariantSnapshot(variant: {
	size: string | null;
	color: { name: string } | null;
	material: { name: string } | null;
}): string | null {
	const parts = [variant.color?.name, variant.size, variant.material?.name].filter(
		(part): part is string => Boolean(part),
	);
	return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * Prix effectif d'une ligne : l'override de la variante, sinon le prix du
 * produit (règle lean `variant.priceCents ?? product.priceCents`).
 */
export function effectiveUnitPriceCents(item: CheckoutCartItem): number {
	return item.variant.priceCents ?? item.variant.product.priceCents;
}

/** Fige chaque ligne du panier en snapshots de commande. */
export function buildOrderLines(items: CheckoutCartItem[]): CheckoutOrderLine[] {
	return items.map((item) => ({
		variantId: item.variant.id,
		productId: item.variant.product.id,
		nameSnapshot: item.variant.product.name,
		variantSnapshot: buildVariantSnapshot(item.variant),
		unitPriceCents: effectiveUnitPriceCents(item),
		quantity: item.quantity,
		imageUrl: item.variant.product.media[0]?.url ?? null,
	}));
}

export interface CheckoutAmounts {
	amountItemsCents: number;
	amountShippingCents: number;
	amountTotalCents: number;
}

/** Montants de la commande — tout en centimes, recalculé en base, jamais du client. */
export function computeOrderAmounts(
	lines: Array<{ unitPriceCents: number; quantity: number }>,
	shippingCents: number,
): CheckoutAmounts {
	const amountItemsCents = lines.reduce(
		(sum, line) => sum + line.unitPriceCents * line.quantity,
		0,
	);
	return {
		amountItemsCents,
		amountShippingCents: shippingCents,
		amountTotalCents: amountItemsCents + shippingCents,
	};
}

/**
 * Line items Stripe en `price_data` inline (pas de catalogue Stripe — D4).
 * Les montants Stripe sont déjà en centimes : aucun ×100.
 */
export function buildStripeLineItems(
	lines: CheckoutOrderLine[],
): Stripe.Checkout.SessionCreateParams.LineItem[] {
	return lines.map((line) => ({
		quantity: line.quantity,
		price_data: {
			currency: "eur",
			unit_amount: line.unitPriceCents,
			product_data: {
				name: line.nameSnapshot,
				...(line.variantSnapshot ? { description: line.variantSnapshot } : {}),
				...(line.imageUrl ? { images: [line.imageUrl] } : {}),
			},
		},
	}));
}
