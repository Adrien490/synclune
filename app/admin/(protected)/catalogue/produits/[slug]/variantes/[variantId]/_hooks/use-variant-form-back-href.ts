"use client";

import { ROUTES } from "@/shared/constants/urls";
import { useParams } from "next/navigation";

/**
 * Lien de repli des frontières d'erreur des sous-formulaires de variante
 * (`prix`, `stock`).
 *
 * Ces routes n'avaient aucune `error.tsx` propre et héritaient de
 * `[variantId]/error.tsx` — une frontière de **liste** annonçant « La variante n'a
 * pas pu charger » et renvoyant tout en haut, à la liste des produits.
 *
 * Destination utile : le détail de la variante. Repli en cascade sur les
 * variantes du produit, puis sur la liste des produits, si un segment dynamique
 * manque.
 */
export function useVariantFormBackHref(): string {
	const params = useParams<{ slug?: string; variantId?: string }>();
	const slug = typeof params.slug === "string" ? params.slug : null;
	const variantId = typeof params.variantId === "string" ? params.variantId : null;

	if (!slug) return ROUTES.ADMIN.PRODUCTS;
	if (!variantId) return `${ROUTES.ADMIN.PRODUCTS}/${slug}/variantes`;
	return `${ROUTES.ADMIN.PRODUCTS}/${slug}/variantes/${variantId}`;
}
