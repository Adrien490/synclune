import type { GetWishlistReturn } from '@/modules/wishlist/data/get-wishlist'
import { WishlistProductCard } from './wishlist-product-card'

interface WishlistGridProps {
	items: NonNullable<GetWishlistReturn>['items']
}

/**
 * Grid de la wishlist - Server Component
 *
 * Pattern:
 * - Server Component pour initial render
 * - Chaque card contient Client Components pour actions (remove)
 * - Grid responsive (2/3/4 colonnes selon breakpoint)
 */
export function WishlistGrid({ items }: WishlistGridProps) {
	if (!items || items.length === 0) {
		return null
	}

	return (
		<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
			{items.map((item) => (
				<WishlistProductCard key={item.id} item={item} />
			))}
		</div>
	)
}
