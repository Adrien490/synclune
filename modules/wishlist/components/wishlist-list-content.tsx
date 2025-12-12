"use client";

import { Stagger } from "@/shared/components/animations";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { ProductCard } from "@/modules/products/components/product-card";
import type { GetWishlistReturn } from "@/modules/wishlist/data/get-wishlist";
import type { Product } from "@/modules/products/types/product.types";

interface WishlistListContentProps {
	items: GetWishlistReturn["items"];
	pagination: GetWishlistReturn["pagination"];
	totalCount: number;
	perPage: number;
}

/**
 * Contenu de la liste wishlist - Client Component
 *
 * Réutilise ProductCard pour uniformité visuelle avec le reste du site.
 * Les items sont tous marqués comme "en wishlist" via wishlistSkuIds.
 */
export function WishlistListContent({
	items,
	pagination,
	totalCount,
	perPage,
}: WishlistListContentProps) {
	const { nextCursor, prevCursor, hasNextPage, hasPreviousPage } = pagination;

	// Set des SKU IDs en wishlist (tous les items affichés)
	const wishlistSkuIds = new Set(items.map((item) => item.skuId));

	// Dédupliquer par productId pour éviter doublons si plusieurs SKUs du même produit
	const uniqueProducts = (() => {
		const seen = new Set<string>();
		return items.filter((item) => {
			const productId = item.sku.product.id;
			if (seen.has(productId)) return false;
			seen.add(productId);
			return true;
		});
	})();

	return (
		<div className="space-y-8">
			{/* Header avec count */}
			<p className="text-sm text-muted-foreground">
				{totalCount} création{totalCount > 1 ? "s" : ""} dans ta wishlist
			</p>

			{/* Grid des items de wishlist */}
			<Stagger
				className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
				stagger={0.05}
				delay={0.1}
			>
				{uniqueProducts.map((item, index) => (
					<ProductCard
						key={item.id}
						product={item.sku.product as Product}
						index={index}
						wishlistSkuIds={wishlistSkuIds}
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
	);
}
