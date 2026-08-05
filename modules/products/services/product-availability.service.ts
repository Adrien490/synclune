/**
 * Disponibilité d'un produit de liste — logique PURE, sans DB ni effet de bord.
 */
import type { GetProductsReturn } from "../types/product.types";

type ProductFromList = GetProductsReturn["products"][number];

/**
 * Un produit est épuisé quand la somme des stocks de ses SKUs ACTIFS vaut zéro.
 *
 * ⚠️ Même règle que `getProductCardData` (`product-display.service.ts`), qui juge
 * la rupture sur l'AGRÉGAT et non sur le SKU affiché : trois couleurs à un
 * exemplaire ne sont pas une rupture. Les deux doivent rester d'accord — sinon le
 * classement pousserait en fin une pièce que la carte présente comme achetable, ou
 * l'inverse.
 *
 * Un produit sans aucun SKU actif (« à venir ») compte comme épuisé : il n'offre
 * pas d'achat, et c'est le seul critère qui compte ici.
 */
export function isSoldOut(product: ProductFromList): boolean {
	const activeInventory = product.skus
		.filter((sku) => sku.isActive)
		.reduce((total, sku) => total + sku.inventory, 0);
	return activeInventory === 0;
}

/**
 * Réordonne une liste en poussant les pièces épuisées à la FIN, sans changer
 * l'ordre relatif au sein de chaque groupe (tri stable).
 *
 * ## Pourquoi ça existe
 *
 * Le premier écran de la boutique demande les cinq créations les plus récentes,
 * sans aucun critère de stock. Sur un catalogue de pièces UNIQUES, l'épuisé est
 * l'état terminal de chaque pièce, pas un cas de bord : dès que les nouveautés
 * s'espacent, la home peut n'afficher que des voiles « Rupture de stock » — et une
 * carte épuisée perd son bouton d'ajout au panier. Le premier écran n'offrirait
 * alors AUCUN achat (audit du premier écran, 2026-08-05).
 *
 * ## Pourquoi réordonner plutôt que filtrer
 *
 * - Filtrer masquerait les nouveautés, qui sont précisément le sujet de l'étal ;
 *   et une pièce épuisée est un signal de désirabilité, pas un déchet.
 * - `productFiltersSchema.stockStatus` n'accepte qu'UNE valeur d'enum, donc pas
 *   « in_stock OU low_stock » : filtrer côté requête aurait aussi écarté les pièces
 *   à faible stock, celles qu'il faut montrer en premier.
 *
 * L'appelant sur-alloue sa lecture, réordonne, puis coupe : le nombre de cellules
 * ne change pas (c'est lui qui fait tomber juste les rangées aux trois largeurs) et
 * une boutique entièrement épuisée continue de montrer cinq pièces.
 */
export function sortSoldOutLast<T extends ProductFromList>(products: readonly T[]): T[] {
	const available: T[] = [];
	const soldOut: T[] = [];
	for (const product of products) {
		(isSoldOut(product) ? soldOut : available).push(product);
	}
	return [...available, ...soldOut];
}
