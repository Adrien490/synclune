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

import { slugify } from "@/shared/utils/generate-slug";
import type { BaseVariantForList } from "@/shared/types/product-variant.types";

/**
 * Options pour la sélection de la variante principale
 */
export interface GetPrimaryVariantOptions {
	/**
	 * Identité URL de la couleur préférée = NOM DE LA COULEUR SLUGIFIÉ (Color n'a
	 * pas de colonne slug). Si spécifié, priorise les variantes de cette couleur
	 * (Baymard : vignette dynamique selon le filtre). La comparaison slugifie les
	 * deux côtés — un nom brut passé ici fonctionne donc aussi.
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
		// ⚠️ SLUGIFY des deux côtés. La comparaison était `variant.color?.name ===
		// preferredColorSlug`, soit un SLUG confronté à un NOM : « bleu-nuit » ne
		// pouvait jamais égaler « Bleu nuit ». La règle du dépôt est explicite —
		// l'identité URL d'une couleur est son nom slugifié, on ne compare jamais un
		// slug à `color.name`. Le défaut dormait faute d'appelant passant l'option ;
		// il se serait réveillé au premier branchement du filtre couleur sur les cartes.
		const target = slugify(preferredColorSlug);
		const matchesColor = (variant: TVariant) =>
			variant.active && variant.color != null && slugify(variant.color.name) === target;

		const colorVariantInStock = product.variants.find(
			(variant) => matchesColor(variant) && variant.stock > 0,
		);
		if (colorVariantInStock) return colorVariantInStock;

		const colorVariant = product.variants.find(matchesColor);
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
