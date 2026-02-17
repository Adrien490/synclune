"use client";

import { useOptimistic } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { ProductCard } from "@/modules/products/components/product-card";

import type { GetWishlistReturn } from "@/modules/wishlist/data/get-wishlist";
import type { Product } from "@/modules/products/types/product.types";
import {
	WishlistListOptimisticContext,
	type WishlistListOptimisticContextValue,
} from "../contexts/wishlist-list-optimistic-context";

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
 * Les items sont tous marqués comme "en wishlist" via isInWishlist boolean.
 * Utilise useOptimistic pour supprimer visuellement les items immédiatement.
 */
export function WishlistListContent({
	items,
	pagination,
	totalCount,
	perPage,
}: WishlistListContentProps) {
	const { nextCursor, prevCursor, hasNextPage, hasPreviousPage } = pagination;
	const prefersReducedMotion = useReducedMotion();

	// Optimistic state pour la liste d'items (filtre par productId)
	const [optimisticItems, removeOptimisticItem] = useOptimistic(
		items,
		(state, removedProductId: string) => state.filter((item) => item.productId !== removedProductId)
	);

	// Callback pour le contexte - appelé par WishlistButton quand un item est retiré
	const handleItemRemoved = (productId: string) => {
		removeOptimisticItem(productId);
	};

	// Valeur du contexte
	const contextValue: WishlistListOptimisticContextValue = {
		onItemRemoved: handleItemRemoved,
	};

	// Set des Product IDs en wishlist (basé sur l'état optimiste)
	const wishlistProductIds = new Set(optimisticItems.map((item) => item.productId));

	return (
		<WishlistListOptimisticContext.Provider value={contextValue}>
			<div className="space-y-8">
				{/* Header with count */}
				<p className="text-sm text-muted-foreground">
					{optimisticItems.length} article{optimisticItems.length > 1 ? "s" : ""}
				</p>

				{/* Grid des items de wishlist avec animation */}
				<div
					className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
				>
					<AnimatePresence mode="popLayout">
						{optimisticItems.map((item, index) => (
							<motion.div
								key={item.id}
								layout={!prefersReducedMotion}
								initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.9 }}
								transition={prefersReducedMotion ? { duration: 0 } : {
									duration: 0.2,
									delay: Math.min(index * 0.05, 0.3),
									ease: [0.4, 0, 0.2, 1],
								}}
							>
									{/* WishlistItem.product is a subset of Product (missing description,
									reviewStats, _count, collections) but includes all fields that
									ProductCard and getProductCardData actually access at runtime */}
								<ProductCard
									product={item.product as Product}
									index={index}
									isInWishlist={wishlistProductIds.has(item.productId)}
									sectionId="wishlist"
								/>
							</motion.div>
						))}
					</AnimatePresence>
				</div>

				{/* Annonce pour screen readers */}
				<div
					role="status"
					aria-live="polite"
					aria-atomic="true"
					className="sr-only"
				>
					{optimisticItems.length === 0
						? "Votre wishlist est maintenant vide"
						: `${optimisticItems.length} article${optimisticItems.length > 1 ? "s" : ""} dans votre wishlist`}
				</div>

				{/* Pagination */}
				<div className="flex justify-end mt-12">
					<CursorPagination
						perPage={perPage}
						hasNextPage={hasNextPage}
						hasPreviousPage={hasPreviousPage}
						currentPageSize={optimisticItems.length}
						nextCursor={nextCursor}
						prevCursor={prevCursor}
					/>
				</div>
			</div>
		</WishlistListOptimisticContext.Provider>
	);
}
