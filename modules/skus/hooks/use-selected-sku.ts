"use client";

import { useSearchParams } from "next/navigation";
import { findSkuByVariants } from "@/modules/skus/services/find-sku-by-variants";
import { filterCompatibleSkus } from "@/modules/skus/services/filter-compatible-skus";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductSku } from "@/modules/products/types/product-services.types";

interface UseSelectedSkuOptions {
	product: GetProductReturn;
	defaultSku?: ProductSku;
}

interface UseSelectedSkuReturn {
	selectedSku: ProductSku | null;
}

/**
 * Hook pour calculer le SKU sélectionné depuis les paramètres URL
 * Utilise useSearchParams pour réagir aux changements d'URL
 */
export function useSelectedSku({
	product,
	defaultSku,
}: UseSelectedSkuOptions): UseSelectedSkuReturn {
	const searchParams = useSearchParams();

	const selectedSku = (() => {
		const urlVariants = {
			colorSlug: searchParams.get("color") ?? undefined,
			materialSlug: searchParams.get("material") ?? undefined,
			size: searchParams.get("size") ?? undefined,
		};

		// Si aucun param URL, utiliser le SKU par défaut
		if (!Object.values(urlVariants).some(Boolean)) {
			return defaultSku ?? product.skus[0] ?? null;
		}

		// Chercher le SKU exact
		const exactSku = findSkuByVariants(product, urlVariants);
		if (exactSku) return exactSku;

		// Sinon, premier SKU compatible
		const compatibleSkus = filterCompatibleSkus(product, urlVariants);
		return compatibleSkus[0] ?? defaultSku ?? product.skus[0] ?? null;
	})();

	return { selectedSku };
}
