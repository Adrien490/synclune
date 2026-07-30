interface SkuDetail {
	sku: {
		id: string;
		priceInclTax: number;
	};
}

interface CartItem {
	skuId: string;
	quantity: number;
}

/**
 * Calcule le sous-total (en centimes) des lignes du panier, au prix DB.
 *
 * Le prix retenu est `sku.priceInclTax` (re-lu en base par `getSkuDetails`), jamais le
 * `priceAtAdd` envoyé par le client — celui-ci n'est qu'un témoin, comparé au prix DB
 * par l'appelant, qui refuse la commande en cas d'écart.
 *
 * ⚠️ Une ligne sans `skuDetailsResult` correspondant est IGNORÉE ici. Ce n'est pas un
 * skip silencieux : `createOrderInTransaction` recalcule le même sous-total sur les
 * mêmes entrées et lève une `BusinessError` fail-closed si une ligne manque
 * (CHECKOUT-TOTAL-005) — c'est justement cet écart qui rend le cas détectable. Ne pas
 * « corriger » ce filtre en jetant ici : l'invariant aval perdrait son témoin.
 *
 * ## Historique
 *
 * Cette fonction s'appelait `buildStripeLineItems` et construisait en plus un tableau
 * `line_items` Stripe complet (`price_data`, `product_data`, `images`, un
 * `getValidImageUrl` par article) — reliquat du flux Checkout Session. Le flux
 * PaymentIntent n'a pas de line items : son unique appelant ne lisait que `subtotal`, et
 * ce payload était reconstruit à chaque checkout pour rien, avec 8 assertions qui en
 * verrouillaient la forme. Retiré à l'audit checkout Stripe Elements 2026-07-30, F4.
 */
export function computeCartSubtotal(
	cartItems: CartItem[],
	skuDetailsResults: Array<{ success: boolean; data?: SkuDetail }>,
): number {
	let subtotal = 0;

	for (const cartItem of cartItems) {
		const skuResult = skuDetailsResults.find((r) => r.success && r.data?.sku.id === cartItem.skuId);
		if (!skuResult?.success || !skuResult.data) continue;

		subtotal += skuResult.data.sku.priceInclTax * cartItem.quantity;
	}

	return subtotal;
}
