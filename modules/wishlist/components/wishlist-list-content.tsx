"use client";

import { useCallback, useOptimistic, useState } from "react";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { ProductCard } from "@/modules/products/components/product-card";
import { Tombstone } from "@/shared/components/ui/tombstone";

import type { GetWishlistReturn } from "@/modules/wishlist/data/get-wishlist";
import {
	WishlistListOptimisticContext,
	type WishlistListOptimisticContextValue,
	type WishlistTombstoneEntry,
} from "../contexts/wishlist-list-optimistic-context";
import { SwipeableWishlistItem } from "./swipeable-wishlist-item";
import { WishlistEmptyState } from "./wishlist-empty-state";

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
 *
 * État `tombstones` (par productId) : un item en cours de retrait reste visible
 * 5s sous forme de placeholder avec bouton "Annuler" inline (pattern Gmail
 * mobile). À l'expiration, on retire visuellement via `useOptimistic` ;
 * sinon l'undo restore le serveur via `addToWishlist`.
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
		(state, removedProductId: string) =>
			state.filter((item) => item.productId !== removedProductId),
	);

	const [tombstones, setTombstones] = useState<ReadonlyMap<string, WishlistTombstoneEntry>>(
		() => new Map(),
	);

	const markAsTombstone = useCallback((productId: string, entry: WishlistTombstoneEntry) => {
		setTombstones((prev) => {
			const next = new Map(prev);
			next.set(productId, entry);
			return next;
		});
	}, []);

	const cancelTombstone = useCallback((productId: string) => {
		setTombstones((prev) => {
			if (!prev.has(productId)) return prev;
			const next = new Map(prev);
			next.delete(productId);
			return next;
		});
	}, []);

	const handleItemRemoved = useCallback(
		(productId: string) => {
			removeOptimisticItem(productId);
		},
		[removeOptimisticItem],
	);

	const handleTombstoneExpire = useCallback(
		(productId: string) => {
			cancelTombstone(productId);
			handleItemRemoved(productId);
		},
		[cancelTombstone, handleItemRemoved],
	);

	const contextValue: WishlistListOptimisticContextValue = {
		onItemRemoved: handleItemRemoved,
		tombstones,
		markAsTombstone,
		cancelTombstone,
	};

	// Adjust totalCount for optimistic removals on the current page
	const optimisticTotalCount = totalCount - (items.length - optimisticItems.length);

	// Empty state when all items have been optimistically removed
	if (optimisticItems.length === 0 && tombstones.size === 0) {
		return (
			<WishlistListOptimisticContext.Provider value={contextValue}>
				<WishlistEmptyState liveAnnouncement="Votre liste de favoris est maintenant vide" />
			</WishlistListOptimisticContext.Provider>
		);
	}

	return (
		<WishlistListOptimisticContext.Provider value={contextValue}>
			<div className="space-y-8">
				{/* Header with count */}
				<p className="text-muted-foreground text-sm">
					{optimisticTotalCount} article{optimisticTotalCount > 1 ? "s" : ""}
				</p>

				{/* Grid des items de wishlist avec animation */}
				<div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
					<AnimatePresence mode="popLayout">
						{optimisticItems.map((item, index) => {
							const tombstone = tombstones.get(item.productId!);
							return (
								<m.div
									key={item.id}
									initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.9 }}
									transition={
										prefersReducedMotion
											? { duration: 0 }
											: {
													duration: 0.2,
													delay: Math.min(index * 0.05, 0.3),
													ease: MOTION_CONFIG.easing.emphasized,
												}
									}
								>
									{tombstone ? (
										<Tombstone
											message={`${tombstone.displayName} retiré`}
											onUndo={tombstone.onUndo}
											onExpire={() => handleTombstoneExpire(item.productId!)}
											undoAriaLabel={`Annuler la suppression de ${tombstone.displayName}`}
										/>
									) : (
										<SwipeableWishlistItem
											productId={item.productId!}
											itemName={item.product?.title}
										>
											<ProductCard
												product={item.product!}
												index={index}
												isInWishlist
												sectionId="wishlist"
											/>
										</SwipeableWishlistItem>
									)}
								</m.div>
							);
						})}
					</AnimatePresence>
				</div>

				{/* Annonce pour screen readers */}
				<div role="status" aria-live="polite" className="sr-only">
					{optimisticTotalCount} article{optimisticTotalCount > 1 ? "s" : ""} dans vos favoris
				</div>

				{/* Pagination */}
				<div className="mt-12 flex justify-end">
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
