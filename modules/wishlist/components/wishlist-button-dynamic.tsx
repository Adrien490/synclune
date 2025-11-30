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
 */
export function WishlistButtonDynamic({
	product,
	defaultSku,
	initialIsInWishlist,
}: WishlistButtonDynamicProps) {
	const { selectedSku } = useSelectedSku({ product, defaultSku });
	const currentSku = selectedSku ?? defaultSku;

	return (
		<WishlistButtonCompact
			skuId={currentSku.id}
			isInWishlist={initialIsInWishlist}
		/>
	);
}
