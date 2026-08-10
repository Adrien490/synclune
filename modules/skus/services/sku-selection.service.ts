/**
 * Services de sélection et calcul de stock des SKUs
 *
 * Ce module contient la logique métier pour :
 * - Sélectionner le SKU principal d'un produit
 * - Calculer les informations de stock
 *
 * NOTE: Ce service utilise des types génériques avec BaseSkuForList
 * pour éviter une dépendance circulaire avec le module products.
 */

import type {
	BaseSkuForList,
	StockStatus,
	ProductStockInfo,
} from "@/shared/types/product-sku.types";

/**
 * Options pour la sélection du SKU principal
 */
export interface GetPrimarySkuOptions {
	/**
	 * Slug de la couleur préférée (Baymard: thumbnail dynamique selon filtre)
	 * Si spécifié, priorise les SKUs de cette couleur.
	 */
	preferredColorSlug?: string;
}

/**
 * Récupère le SKU principal pour les listes (logique de sélection intelligente)
 *
 * Ordre de priorité :
 * 1. (Si preferredColorSlug) SKU de la couleur préférée en stock
 * 2. (Si preferredColorSlug) SKU de la couleur préférée (même hors stock)
 * 3. Représentant éditorial — rang 0 de `(position asc)` — actif ET en stock
 * 4. Premier SKU en stock, trié par prix croissant
 * 5. Représentant éditorial actif (épuisé — plus rien d'autre en stock)
 * 6. Premier SKU actif
 * 7. Premier SKU (fallback)
 *
 * Le représentant est le premier SKU actif par `position` (remplace
 * `isDefault`, audit schéma V5, lot A2) ; le tri est stable, donc à positions
 * égales l'ordre du select — `(position asc, id asc)` — départage.
 *
 * ⚠️ Le représentant épuisé ne prime plus sur une variante sœur en stock (audit
 * ProductCard 2026-08-08) : la carte affichait le prix — et liait vers la
 * PDP — d'une variante inachetable, sans autre signal que la pastille barrée,
 * pendant qu'une sœur en stock existait. Le rang 0 reste l'éditorial du cas
 * nominal (priorité 3) et le meilleur représentant quand PLUS RIEN n'est en
 * stock (priorité 5) — il ne cède que la fenêtre où il mentirait.
 *
 * @param product - Produit avec ses SKUs
 * @param options - Options de sélection (couleur préférée, etc.)
 */
export function getPrimarySkuForList<
	TSku extends BaseSkuForList,
	TProduct extends { skus?: TSku[] | null },
>(product: TProduct, options?: GetPrimarySkuOptions): TSku | null {
	if (!product.skus || product.skus.length === 0) {
		return null;
	}

	const { preferredColorSlug } = options ?? {};

	// 1. Si couleur préférée spécifiée, prioriser cette couleur (Baymard pattern)
	// M2M tolérant : un SKU « contient » preferredColorSlug si une de ses couleurs match.
	if (preferredColorSlug) {
		// 1a. SKU de la couleur préférée en stock
		const colorSkuInStock = product.skus.find(
			(sku) =>
				sku.isActive &&
				sku.colors.some((c) => c.color.slug === preferredColorSlug) &&
				sku.inventory > 0,
		);
		if (colorSkuInStock) return colorSkuInStock;

		// 1b. SKU de la couleur préférée (même hors stock)
		const colorSku = product.skus.find(
			(sku) => sku.isActive && sku.colors.some((c) => c.color.slug === preferredColorSlug),
		);
		if (colorSku) return colorSku;
	}

	// 2. Représentant éditorial (rang 0) — seulement s'il est achetable (cf. ⚠️ JSDoc)
	const representativeSku = [...product.skus]
		.sort((a, b) => a.position - b.position)
		.find((sku) => sku.isActive);
	if (representativeSku && representativeSku.inventory > 0) return representativeSku;

	// 3. SKU en stock, trié par priceInclTax ASC
	const inStockSkus = product.skus
		.filter((sku) => sku.isActive && sku.inventory > 0)
		.sort((a, b) => a.priceInclTax - b.priceInclTax);

	if (inStockSkus.length > 0) return inStockSkus[0]!;

	// 4. Plus rien en stock : le représentant épuisé redevient le meilleur choix
	if (representativeSku) return representativeSku;

	// 5. Premier SKU actif
	const activeSku = product.skus.find((sku) => sku.isActive);
	return activeSku ?? product.skus[0] ?? null;
}

/**
 * Récupère les informations de stock du produit
 */
export function getStockInfoForList<
	TSku extends BaseSkuForList,
	TProduct extends { skus?: TSku[] | null },
>(product: TProduct): ProductStockInfo {
	const activeSkus = product.skus?.filter((sku) => sku.isActive) ?? [];
	const totalInventory = activeSkus.reduce((sum, sku) => sum + sku.inventory, 0);
	const availableSkus = activeSkus.filter((sku) => sku.inventory > 0).length;

	let status: StockStatus;
	let message: string;

	// Système simplifié : en stock ou rupture de stock
	if (totalInventory === 0) {
		status = "out_of_stock";
		message = "Rupture de stock";
	} else {
		status = "in_stock";
		message = "En stock";
	}

	return {
		status,
		totalInventory,
		availableSkus,
		message,
	};
}

// Ré-export des types pour faciliter les imports
