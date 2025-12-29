"use client";

import { ItemCountBadge } from "@/shared/components/ui/item-count-badge";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";

/**
 * Badge panier - Client Component avec optimistic UI
 *
 * Lit le count depuis le store Zustand pour affichage instantané.
 * Le store est hydraté par BadgeCountsStoreProvider avec la valeur serveur,
 * puis mis à jour de façon optimistic par useAddToCart, useRemoveFromCart, etc.
 */
export function CartBadge() {
	const count = useBadgeCountsStore((state) => state.cartCount);

	return (
		<ItemCountBadge
			count={count}
			singularLabel="article dans ton panier"
			pluralLabel="articles dans ton panier"
			size="default"
		/>
	);
}
