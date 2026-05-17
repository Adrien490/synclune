"use client";

import { CountBadge } from "@/shared/components/ui/count-badge";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";

/**
 * Badge wishlist — Client Component avec optimistic UI.
 *
 * Variant `dot` (point coloré sans nombre) volontaire : le nombre exact de
 * favoris est moins actionable que le panier ; un point réduit la charge
 * cognitive et différencie visuellement les deux icônes côte à côte dans le
 * header. Le compteur reste annoncé aux lecteurs d'écran via la live region.
 */
export function WishlistBadge() {
	const count = useBadgeCountsStore((state) => state.wishlistCount);

	return (
		<CountBadge count={count} size="sm" type="dot" singularLabel="favori" pluralLabel="favoris" />
	);
}
