/**
 * Services de sélection et calcul de stock des variantes.
 *
 * Schéma lean (lot 2) : une variante porte UNE couleur (FK nullable), le prix
 * est un override optionnel du prix produit. Le « représentant » est la
 * première variante active (ordre id asc livré par les selects).
 *
 * NOTE: types génériques BaseVariantForList pour éviter une dépendance circulaire
 * avec le module products.
 */

import type {
	BaseVariantForList,
	StockStatus,
	ProductStockInfo,
} from "@/shared/types/product-variant.types";

/**
 * Options pour la sélection de la variante principale
 */
export interface GetPrimaryVariantOptions {
	/**
	 * Identité URL de la couleur préférée (= NOM de la couleur depuis le schéma
	 * lean). Si spécifié, priorise les variantes de cette couleur (Baymard :
	 * thumbnail dynamique selon filtre).
	 */
	preferredColorSlug?: string;
}

/**
 * Récupère la variante principale pour les listes.
 *
 * Ordre de priorité :
 * 1. (Si preferredColorSlug) variante de la couleur préférée en stock
 * 2. (Si preferredColorSlug) variante de la couleur préférée (même hors stock)
 * 3. Première variante active en stock (ordre du select)
 * 4. Variante en stock au prix croissant
 * 5. Première variante active (épuisée — plus rien d'autre en stock)
 * 6. Première variante (fallback)
 */
export function getPrimaryVariantForList<
	TVariant extends BaseVariantForList,
	TProduct extends { variants?: TVariant[] | null },
>(product: TProduct, options?: GetPrimaryVariantOptions): TVariant | null {
	if (!product.variants || product.variants.length === 0) {
		return null;
	}

	const { preferredColorSlug } = options ?? {};

	if (preferredColorSlug) {
		const colorVariantInStock = product.variants.find(
			(variant) =>
				variant.active && variant.color?.name === preferredColorSlug && variant.stock > 0,
		);
		if (colorVariantInStock) return colorVariantInStock;

		const colorVariant = product.variants.find(
			(variant) => variant.active && variant.color?.name === preferredColorSlug,
		);
		if (colorVariant) return colorVariant;
	}

	// Représentant = première variante active — seulement si achetable
	const representativeVariant = product.variants.find((variant) => variant.active);
	if (representativeVariant && representativeVariant.stock > 0) return representativeVariant;

	// Variante en stock, prix croissant (l'override null hérite du prix produit :
	// on le classe en tête, il est au prix « de base »)
	const inStockVariants = product.variants
		.filter((variant) => variant.active && variant.stock > 0)
		.sort((a, b) => (a.priceCents ?? -1) - (b.priceCents ?? -1));

	if (inStockVariants.length > 0) return inStockVariants[0]!;

	// Plus rien en stock : le représentant épuisé redevient le meilleur choix
	if (representativeVariant) return representativeVariant;

	return product.variants[0] ?? null;
}

/**
 * Récupère les informations de stock du produit
 */
export function getStockInfoForList<
	TVariant extends BaseVariantForList,
	TProduct extends { variants?: TVariant[] | null },
>(product: TProduct): ProductStockInfo {
	const activeVariants = product.variants?.filter((variant) => variant.active) ?? [];
	const totalStock = activeVariants.reduce((sum, variant) => sum + variant.stock, 0);
	const availableVariants = activeVariants.filter((variant) => variant.stock > 0).length;

	let status: StockStatus;
	let message: string;

	if (totalStock === 0) {
		status = "out_of_stock";
		message = "Rupture de stock";
	} else {
		status = "in_stock";
		message = "En stock";
	}

	return {
		status,
		totalStock,
		availableVariants,
		message,
	};
}
