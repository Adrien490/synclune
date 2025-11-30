"use client";

import { useSelectedSku } from "@/modules/skus/hooks/use-selected-sku";
import { WishlistButtonCompact } from "./wishlist-button-compact";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductSku } from "@/modules/products/types/product-services.types";

interface WishlistButtonDynamicProps {
	product: GetProductReturn;
	defaultSku: ProductSku;
	initialIsInWishlist: boolean;
}

/**
 * Bouton Wishlist Dynamique - Client Component
 *
 * Wrapper qui synchronise le bouton wishlist avec le SKU sélectionné via URL.
 * Utilise useSelectedSku pour réagir aux changements de variants.
 *
 * Pattern : Le SKU est calculé côté client depuis les searchParams,
 * permettant une mise à jour instantanée sans attendre le SSR.
 *
 * Note : initialIsInWishlist n'est valide que pour le defaultSku.
 * Quand l'utilisateur change de variante, on réinitialise à false car
 * on ne connaît pas l'état wishlist du nouveau SKU sans requête serveur.
 * L'utilisateur peut toujours toggle et l'état se mettra à jour via optimistic UI.
 */
export function WishlistButtonDynamic({
	product,
	defaultSku,
	initialIsInWishlist,
}: WishlistButtonDynamicProps) {
	const { selectedSku } = useSelectedSku({ product, defaultSku });
	const currentSku = selectedSku ?? defaultSku;

	// L'état wishlist initial n'est valide que pour le defaultSku
	// Pour les autres SKUs, on part de false (l'utilisateur peut toggle)
	const isCurrentSkuDefault = currentSku.id === defaultSku.id;
	const currentIsInWishlist = isCurrentSkuDefault ? initialIsInWishlist : false;

	return (
		<WishlistButtonCompact
			key={currentSku.id}
			skuId={currentSku.id}
			isInWishlist={currentIsInWishlist}
		/>
	);
}
