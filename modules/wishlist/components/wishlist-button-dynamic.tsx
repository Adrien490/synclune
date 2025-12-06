"use client";

import { useSelectedSku } from "@/modules/skus/hooks/use-selected-sku";
import { WishlistButton } from "./wishlist-button";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductSku } from "@/modules/products/types/product-services.types";

interface WishlistButtonDynamicProps {
	product: GetProductReturn;
	defaultSku: ProductSku;
	initialIsInWishlist: boolean;
	/** Map optionnelle SKU ID -> état wishlist (pour précharger plusieurs états) */
	wishlistStates?: Record<string, boolean>;
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
 * Comportement wishlist lors du changement de SKU :
 * - Pour le defaultSku : utilise initialIsInWishlist (pré-fetchée côté serveur)
 * - Pour les autres SKUs : utilise wishlistStates si fourni, sinon false
 * - L'utilisateur peut toujours toggle et l'optimistic UI affiche le changement immédiatement
 * - Le serveur gère l'état réel et la persistance
 *
 * Pour améliorer l'UX, le parent peut passer wishlistStates avec l'état de tous les SKUs.
 */
export function WishlistButtonDynamic({
	product,
	defaultSku,
	initialIsInWishlist,
	wishlistStates,
}: WishlistButtonDynamicProps) {
	const { selectedSku } = useSelectedSku({ product, defaultSku });
	const currentSku = selectedSku ?? defaultSku;

	// Déterminer l'état wishlist pour le SKU actuel
	const currentIsInWishlist = (() => {
		// Priorité 1 : État préchargé dans wishlistStates
		if (wishlistStates && currentSku.id in wishlistStates) {
			return wishlistStates[currentSku.id];
		}

		// Priorité 2 : État initial si c'est le defaultSku
		if (currentSku.id === defaultSku.id) {
			return initialIsInWishlist;
		}

		// Fallback : false (l'utilisateur peut toggle, optimistic UI affichera le changement)
		return false;
	})();

	return (
		<WishlistButton
			key={currentSku.id}
			skuId={currentSku.id}
			isInWishlist={currentIsInWishlist}
		/>
	);
}
