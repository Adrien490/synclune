'use client'

import { Stagger } from "@/shared/components/animations"
import { CursorPagination } from "@/shared/components/cursor-pagination"
import type { GetWishlistReturn } from '@/modules/wishlist/data/get-wishlist'
import { ClearWishlistButton } from '@/modules/wishlist/components/clear-wishlist-button'
import { WishlistProductCard } from './wishlist-product-card'

interface WishlistListClientProps {
	items: GetWishlistReturn['items']
	pagination: GetWishlistReturn['pagination']
	totalCount: number
	perPage: number
}

/**
 * Client Component pour la liste de wishlist
 *
 * Pattern :
 * - Source de vérité unique (DB) pour éviter désynchronisations
 * - Affiche le count total et bouton "Vider"
 * - Affiche la grid des items
 * - Affiche la pagination cursor-based
 *
 * UX :
 * - Revalidation automatique après mutations
 * - Animation smooth de disparition
 * - Feedback via isPending dans les composants enfants
 */
export function WishlistListClient({
	items,
	pagination,
	totalCount,
	perPage,
}: WishlistListClientProps) {
	const { nextCursor, prevCursor, hasNextPage, hasPreviousPage } = pagination

	return (
		<div className="space-y-8">
			{/* Header avec count et bouton vider */}
			<div className="flex justify-between items-center">
				<p className="text-sm text-muted-foreground">
					{totalCount} création{totalCount > 1 ? 's' : ''} dans votre wishlist
				</p>
				<ClearWishlistButton itemCount={totalCount} />
			</div>

			{/* Grid des items de wishlist */}
			<Stagger
				className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
				stagger={0.05}
				delay={0.1}
			>
				{items.map((item) => (
					<WishlistProductCard
						key={item.id}
						item={item}
					/>
				))}
			</Stagger>

			{/* Pagination */}
			<div className="flex justify-end mt-12">
				<CursorPagination
					perPage={perPage}
					hasNextPage={hasNextPage}
					hasPreviousPage={hasPreviousPage}
					currentPageSize={items.length}
					nextCursor={nextCursor}
					prevCursor={prevCursor}
				/>
			</div>
		</div>
	)
}
