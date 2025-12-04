"use client";

import { Stagger } from "@/shared/components/animations"
import { CursorPagination } from "@/shared/components/cursor-pagination"
import type { GetWishlistReturn } from '@/modules/wishlist/data/get-wishlist'
import { ClearWishlistButton } from '@/modules/wishlist/components/clear-wishlist-button'
import { WishlistProductCard } from './wishlist-product-card'

interface WishlistListContentProps {
	items: GetWishlistReturn['items']
	pagination: GetWishlistReturn['pagination']
	totalCount: number
	perPage: number
}

/**
 * Contenu de la liste wishlist - Client Component
 *
 * Pattern :
 * - Source de vérité unique (DB) pour éviter désynchronisations
 * - Affiche le count total et bouton "Vider"
 * - Affiche la grid des items avec animations
 * - Affiche la pagination cursor-based
 */
export function WishlistListContent({
	items,
	pagination,
	totalCount,
	perPage,
}: WishlistListContentProps) {
	const { nextCursor, prevCursor, hasNextPage, hasPreviousPage } = pagination

	return (
		<div className="space-y-8">
			{/* Header avec count et bouton vider */}
			<div className="flex justify-between items-center">
				<p className="text-sm text-muted-foreground">
					{totalCount} création{totalCount > 1 ? 's' : ''} dans ta wishlist
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
