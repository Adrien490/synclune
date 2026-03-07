"use client";

import { useOptimistic } from "react";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { ProductCard } from "@/modules/products/components/product-card";
import { Button } from "@/shared/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import { Heart } from "lucide-react";
import Link from "next/link";

import type { GetWishlistReturn } from "@/modules/wishlist/data/get-wishlist";
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
		(state, removedProductId: string) =>
			state.filter((item) => item.productId !== removedProductId),
	);

	// Callback pour le contexte - appelé par WishlistButton quand un item est retiré
	const handleItemRemoved = (productId: string) => {
		removeOptimisticItem(productId);
	};

	// Valeur du contexte
	const contextValue: WishlistListOptimisticContextValue = {
		onItemRemoved: handleItemRemoved,
	};

	// Adjust totalCount for optimistic removals on the current page
	const optimisticTotalCount = totalCount - (items.length - optimisticItems.length);

	// Set des Product IDs en wishlist (basé sur l'état optimiste)
	const wishlistProductIds = new Set(optimisticItems.map((item) => item.productId));

	// Empty state when all items have been optimistically removed
	if (optimisticItems.length === 0) {
		return (
			<WishlistListOptimisticContext.Provider value={contextValue}>
				<Empty className="mt-4 mb-12 sm:my-12">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Heart className="size-6" />
						</EmptyMedia>
						<EmptyTitle>Votre wishlist est vide</EmptyTitle>
					</EmptyHeader>
					<EmptyContent>
						<p className="text-muted-foreground mb-6 max-w-md">
							Découvrez nos créations artisanales et ajoutez vos coups de cœur à votre wishlist pour
							les retrouver facilement.
						</p>
						<div className="flex flex-col gap-3 sm:flex-row">
							<Button asChild variant="primary" size="lg">
								<Link href="/produits">Découvrir nos créations</Link>
							</Button>
							<Button asChild variant="outline" size="lg">
								<Link href="/collections">Voir les collections</Link>
							</Button>
						</div>
					</EmptyContent>
				</Empty>

				{/* Annonce pour screen readers */}
				<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
					Votre wishlist est maintenant vide
				</div>
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
						{optimisticItems.map((item, index) => (
							<m.div
								key={item.id}
								layout={!prefersReducedMotion}
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
								<ProductCard
									product={item.product!}
									index={index}
									isInWishlist={wishlistProductIds.has(item.productId)}
									sectionId="wishlist"
								/>
							</m.div>
						))}
					</AnimatePresence>
				</div>

				{/* Annonce pour screen readers */}
				<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
					{optimisticTotalCount} article{optimisticTotalCount > 1 ? "s" : ""} dans votre wishlist
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
