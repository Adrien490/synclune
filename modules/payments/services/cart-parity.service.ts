interface ClientCartLine {
	skuId: string;
	quantity: number;
}

interface ServerCartLine {
	sku: { id: string };
	quantity: number;
}

/**
 * Empreinte d'un panier : lignes `skuId:quantity` triées, insensible à l'ordre.
 * Les prix n'y entrent PAS — ils sont re-vérifiés séparément contre la base par
 * chaque appelant, avec leur propre message d'erreur (« les prix ont changé »).
 */
function fingerprint(lines: Array<{ skuId: string; quantity: number }>): string {
	return lines
		.map((line) => `${line.skuId}:${line.quantity}`)
		.sort()
		.join("|");
}

/**
 * Le panier soumis par le client correspond-il au panier serveur ?
 *
 * ## Pourquoi cette garde existe
 *
 * `initializePayment` et `confirmCheckout` reçoivent leurs lignes du CLIENT et ne les
 * confrontaient jamais au panier serveur (`getCart()`) — constat F6 de l'audit du
 * 2026-07-26, assumé alors comme invariant documenté. Les prix étaient re-lus en base et
 * le stock verrouillé `FOR UPDATE`, donc pas de sous-facturation possible : le trou était
 * ailleurs, dans la **divergence des bases de calcul**.
 *
 * `updatePaymentAmount` et `validateDiscountCode` partent du panier SERVEUR, tandis que
 * `confirmCheckout` et `createOrderInTransaction` facturent le panier CLIENT. Deux
 * paniers différents ⇒ deux `excludeSaleItems` différents ⇒ une remise affichée qui ne
 * correspond pas à celle appliquée, et un `order.total` qui peut dépasser le
 * `displayedTotal` — auquel cas la garde de consentement refuse le paiement avec un
 * message de divergence, sans que rien n'indique que la vraie cause est un panier périmé.
 *
 * Le scénario réel n'exige aucune manipulation : deux onglets. L'onglet A a été rendu
 * avec le panier d'il y a dix minutes ; l'onglet B a changé une quantité. Le
 * re-init sur retour d'onglet appelle bien `validateCart()`, mais un simple changement de
 * quantité n'est pas « invalide » : l'onglet A reste périmé jusqu'au clic sur Payer.
 *
 * ## Ce qu'elle ne fait pas
 *
 * Ce n'est pas une garde anti-fraude : un client peut toujours poster des lignes
 * arbitraires, elles seront simplement refusées ici. L'autorité reste (1) le prix DB,
 * (2) le stock verrouillé, (3) `order.total` posé sur le PI avant capture. Cette garde
 * fait converger les bases de calcul et transforme un cul-de-sac au montant en un
 * message actionnable, en amont.
 *
 * Audit checkout Stripe Elements 2026-07-30, G3.
 */
export function cartMatchesServerCart(
	clientItems: ClientCartLine[],
	serverItems: ServerCartLine[],
): boolean {
	return (
		fingerprint(clientItems) ===
		fingerprint(serverItems.map((item) => ({ skuId: item.sku.id, quantity: item.quantity })))
	);
}

/**
 * Message unique des deux appelants. Il dit quoi faire, pas ce qui s'est passé : la
 * cause (autre onglet, panier modifié entre-temps) n'est pas actionnable pour le client.
 */
export const CART_PARITY_ERROR =
	"Ton panier a changé depuis l'ouverture de cette page. Actualise pour repartir du bon montant.";
