"use client";

import { useSearchParams } from "next/navigation";
import { findSkuByVariants } from "@/modules/skus/services/find-sku-by-variants";
import { filterCompatibleSkus } from "@/modules/skus/services/filter-compatible-skus";
import type { GetProductReturn, ProductSku } from "@/modules/products/types/product.types";

interface UseSelectedSkuOptions {
	product: GetProductReturn;
	defaultSku?: ProductSku;
}

interface UseSelectedSkuReturn {
	selectedSku: ProductSku | null;
}

/**
 * Verifie si un SKU est disponible (en stock et actif)
 */
function isSkuAvailable(sku: ProductSku | undefined | null): boolean {
	return sku != null && sku.inventory > 0 && sku.isActive;
}

/**
 * Trouve le premier SKU disponible dans une liste
 */
function findFirstAvailableSku(skus: readonly ProductSku[]): ProductSku | null {
	return skus.find(isSkuAvailable) ?? null;
}

/**
 * Hook pour calculer le SKU sélectionné depuis les paramètres URL
 * Utilise useSearchParams pour réagir aux changements d'URL
 *
 * Priorite de selection :
 * 1. SKU exact correspondant aux parametres URL
 * 2. Premier SKU compatible disponible
 * 3. Premier SKU compatible (meme indisponible, pour afficher l'etat rupture)
 * 4. SKU par defaut
 * 5. Premier SKU du produit
 */
export function useSelectedSku({
	product,
	defaultSku,
}: UseSelectedSkuOptions): UseSelectedSkuReturn {
	const searchParams = useSearchParams();

	const selectedSku = ((): ProductSku | null => {
		const urlVariants = {
			colorSlug: searchParams.get("color") ?? undefined,
			materialSlug: searchParams.get("material") ?? undefined,
			size: searchParams.get("size") ?? undefined,
		};

		// Si aucun param URL, utiliser le SKU par defaut disponible ou le premier disponible
		if (!Object.values(urlVariants).some(Boolean)) {
			if (isSkuAvailable(defaultSku)) return defaultSku!;
			const firstAvailable = findFirstAvailableSku(product.skus);
			if (firstAvailable) return firstAvailable;
			return defaultSku ?? product.skus[0] ?? null;
		}

		// Chercher le SKU exact correspondant aux params URL
		// Note: les fonctions génériques retournent le type de base mais les données sont du bon type
		const exactSku = findSkuByVariants(product, urlVariants) as ProductSku | null;
		if (exactSku) return exactSku;

		// Chercher parmi les SKUs compatibles
		const compatibleSkus = filterCompatibleSkus(product, urlVariants) as ProductSku[];

		// Preferer un SKU disponible parmi les compatibles
		const availableCompatible = findFirstAvailableSku(compatibleSkus);
		if (availableCompatible) return availableCompatible;

		// Sinon retourner le premier compatible (meme indisponible) pour afficher l'etat
		if (compatibleSkus[0]) return compatibleSkus[0];

		// Fallback: SKU par defaut ou premier du produit
		return defaultSku ?? product.skus[0] ?? null;
	})();

	return { selectedSku };
}
