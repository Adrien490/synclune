"use client";

import { useSearchParams } from "next/navigation";
import { findVariantBySelectors } from "@/modules/variants/services/variant-finder.service";
import { filterCompatibleVariants } from "@/modules/variants/services/variant-filter.service";
import type { GetProductReturn, ProductVariant } from "@/modules/products/types/product.types";

interface UseSelectedVariantOptions {
	product: GetProductReturn;
	defaultVariant?: ProductVariant;
}

interface UseSelectedVariantReturn {
	selectedVariant: ProductVariant | null;
}

/**
 * Verifie si un VARIANT est disponible (en stock et actif)
 */
function isVariantAvailable(variant: ProductVariant | undefined | null): boolean {
	return variant != null && variant.stock > 0 && variant.active;
}

/**
 * Trouve le premier VARIANT disponible dans une liste
 */
function findFirstAvailableVariant(variants: readonly ProductVariant[]): ProductVariant | null {
	return variants.find(isVariantAvailable) ?? null;
}

/**
 * Hook pour calculer le VARIANT sélectionné depuis les paramètres URL
 * Utilise useSearchParams pour réagir aux changements d'URL
 *
 * Priorite de selection :
 * 1. VARIANT exact correspondant aux parametres URL
 * 2. Premier VARIANT compatible disponible
 * 3. Premier VARIANT compatible (meme indisponible, pour afficher l'etat rupture)
 * 4. VARIANT par defaut
 * 5. Premier VARIANT du produit
 */
export function useSelectedVariant({
	product,
	defaultVariant,
}: UseSelectedVariantOptions): UseSelectedVariantReturn {
	const searchParams = useSearchParams();

	const selectedVariant = ((): ProductVariant | null => {
		// ⚠️ Pas de `colorCombo` ici : le champ (combo M2M d'avant la migration lean)
		// n'existe pas dans `VariantSelectors` et `matchColor` ne l'a jamais lu — trois
		// commentaires prétendaient pourtant qu'il « primait ». Le deep-link d'une
		// variante passe par `?color=<slug>&material=<slug>&size=`, seuls paramètres
		// que les sélecteurs écrivent et que le matching sait résoudre.
		const urlVariants = {
			colorSlug: searchParams.get("color") ?? undefined,
			materialSlug: searchParams.get("material") ?? undefined,
			size: searchParams.get("size") ?? undefined,
		};

		// Si aucun param URL, utiliser le VARIANT par defaut disponible ou le premier disponible
		if (!Object.values(urlVariants).some(Boolean)) {
			if (isVariantAvailable(defaultVariant)) return defaultVariant!;
			const firstAvailable = findFirstAvailableVariant(product.variants);
			if (firstAvailable) return firstAvailable;
			return defaultVariant ?? product.variants[0] ?? null;
		}

		// Chercher le VARIANT exact correspondant aux params URL
		// Note: les fonctions génériques retournent le type de base mais les données sont du bon type
		const exactVariant = findVariantBySelectors(product, urlVariants) as ProductVariant | null;
		if (exactVariant) return exactVariant;

		// Chercher parmi les VARIANTs compatibles
		const compatibleVariants = filterCompatibleVariants(product, urlVariants) as ProductVariant[];

		// Preferer un VARIANT disponible parmi les compatibles
		const availableCompatible = findFirstAvailableVariant(compatibleVariants);
		if (availableCompatible) return availableCompatible;

		// Sinon retourner le premier compatible (meme indisponible) pour afficher l'etat
		if (compatibleVariants[0]) return compatibleVariants[0];

		// Fallback: VARIANT par defaut ou premier du produit
		return defaultVariant ?? product.variants[0] ?? null;
	})();

	return { selectedVariant };
}
