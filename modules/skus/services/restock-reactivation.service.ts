/**
 * Règle de réactivation d'un SKU au restock.
 *
 * Le webhook d'encaissement désactive un SKU tombé à `inventory: 0`
 * (`checkout-order-processing.service.ts`). Tout chemin qui recrédite du stock doit
 * donc savoir défaire cette désactivation — sinon l'article reste invisible en
 * vitrine alors qu'il est de nouveau disponible : `GET_PRODUCT_SELECT` filtre
 * `isActive: true`, et sur un produit mono-SKU la PDP part en `notFound()`
 * (cf. STOCK-LAST-ACTIVE-SKU-001).
 *
 * ⚠️ La subtilité, et la raison d'être de ce prédicat : on ne réactive QUE ce que le
 * système a désactivé. Un SKU à `inventory > 0` et `isActive: false` a été désactivé
 * **à la main par l'admin** — le ressusciter à l'occasion d'un remboursement
 * remettrait en vente un bijou volontairement retiré. Le discriminant est donc
 * `inventory === 0` AVANT le crédit, pas après.
 *
 * D'où la contrainte d'appel : passer l'état lu **avant** l'`increment`. Un état lu
 * après verrait `inventory > 0` et ne réactiverait jamais rien.
 *
 * La règle vivait uniquement dans `payment-intent.service.ts` ; `cancel-order`,
 * `process-refund` et `reconcile-refunds` recréditaient sans la connaître (audit
 * « SKUs et variantes » 2026-07-30, P1-1). Elle est ici pour être partagée.
 *
 * ⚠️ Alternative écartée sciemment : les chemins en SQL brut pourraient réactiver
 * atomiquement sans lecture préalable, via
 * `SET "isActive" = CASE WHEN "isActive" = false AND "inventory" = 0 THEN true ELSE
 * "isActive" END` (dans un `UPDATE` Postgres, le membre droit voit les ANCIENNES
 * valeurs, donc le discriminant serait correct). On ne le fait pas : la règle
 * existerait alors en DEUX expressions — une en SQL, une en TypeScript — et c'est
 * précisément la divergence que ce fichier supprime. Les 4 chemins de restock lisent
 * donc l'état, appellent ce prédicat, puis écrivent.
 */
export function shouldReactivateAfterRestock(
	skuBeforeRestock: { isActive: boolean; inventory: number } | undefined | null,
): boolean {
	if (!skuBeforeRestock) return false;
	return !skuBeforeRestock.isActive && skuBeforeRestock.inventory === 0;
}

/**
 * Un restock rend-il l'article de nouveau achetable (transition 0 → N) ?
 *
 * Gate OBLIGATOIRE avant `notifyBackInStock` : celle-ci ne re-vérifie PAS
 * `inventory > 0` elle-même, et `WishlistItem.backInStockNotifiedAt` est `null` par
 * défaut sur TOUS les items — sans ce gate, un restock quelconque notifierait les
 * favoris ajoutés alors que le produit était en stock.
 */
export function crossesBackInStock(previousInventory: number, newInventory: number): boolean {
	return previousInventory === 0 && newInventory > 0;
}
