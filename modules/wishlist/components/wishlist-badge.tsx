"use client";

import { ItemCountBadge } from "@/shared/components/ui/item-count-badge";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";

/**
 * Badge wishlist - Client Component avec optimistic UI
 *
 * Lit le count depuis le store Zustand pour affichage instantané.
 * Le store est hydraté par BadgeCountsStoreProvider avec la valeur serveur,
 * puis mis à jour de façon optimistic par useWishlistToggle.
 */
export function WishlistBadge() {
	const count = useBadgeCountsStore((state) => state.wishlistCount);

	return (
		<ItemCountBadge
			count={count}
			singularLabel="article dans ta wishlist"
			pluralLabel="articles dans ta wishlist"
			size="sm"
		/>
	);
}
