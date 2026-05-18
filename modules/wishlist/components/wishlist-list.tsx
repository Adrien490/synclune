import { WishlistListContent } from "./wishlist-list-content";
import { WishlistEmptyState } from "./wishlist-empty-state";
import type { GetWishlistReturn } from "@/modules/wishlist/data/get-wishlist";

interface WishlistListProps {
	wishlistPromise: Promise<GetWishlistReturn>;
	perPage: number;
}

/**
 * Liste de la wishlist avec pagination - Server Component
 *
 * Pattern :
 * - Reçoit une Promise de wishlist paginée
 * - Affiche un empty state si aucun item
 * - Délègue l'affichage avec optimistic updates au Client Component
 */
export async function WishlistList({ wishlistPromise, perPage }: WishlistListProps) {
	const { items, pagination, totalCount } = await wishlistPromise;

	// Empty state si aucun item
	if (items.length === 0) {
		return <WishlistEmptyState />;
	}

	// Déléguer au Client Component pour les optimistic updates
	return (
		<WishlistListContent
			items={items}
			pagination={pagination}
			totalCount={totalCount}
			perPage={perPage}
		/>
	);
}
