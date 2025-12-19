"use client";

import { AnimatePresence, motion } from "framer-motion";
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
			{/* Grid des items de wishlist avec animation */}
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
				<AnimatePresence mode="popLayout">
					{uniqueProducts.map((item, index) => (
						<motion.div
							key={item.id}
							layout
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.9 }}
							transition={{
								duration: 0.2,
								delay: index * 0.05,
								ease: [0.4, 0, 0.2, 1],
							}}
						>
							<ProductCard
								product={item.sku.product as Product}
								index={index}
								wishlistSkuIds={wishlistSkuIds}
							/>
						</motion.div>
					))}
				</AnimatePresence>
			</div>

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
