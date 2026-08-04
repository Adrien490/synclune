import { WishlistListContent } from "./wishlist-list-content";
import { WishlistEmptyState } from "./wishlist-empty-state";
import type { GetWishlistReturn } from "@/modules/wishlist/data/get-wishlist";

interface WishlistListProps {
	wishlistPromise: Promise<GetWishlistReturn>;
}

/**
 * Liste de la wishlist - Server Component
 *
 * Pattern :
 * - Reçoit une Promise de wishlist (tous les favoris — le cookie est plafonné
 *   à 100 ids, pas de pagination)
 * - Affiche un empty state si aucun item
 * - Délègue l'affichage avec optimistic updates au Client Component
 */
export async function WishlistList({ wishlistPromise }: WishlistListProps) {
	const { items } = await wishlistPromise;

	// Empty state si aucun item
	if (items.length === 0) {
		return <WishlistEmptyState />;
	}

	// Déléguer au Client Component pour les optimistic updates
	return <WishlistListContent items={items} />;
}
