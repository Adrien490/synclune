"use client";

import { useEffect, useOptimistic, useRef } from "react";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { announce } from "@/shared/utils/announce";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { ProductCard } from "@/modules/products/components/product-card";

import type { GetWishlistReturn } from "@/modules/wishlist/data/get-wishlist";
import {
	WishlistListOptimisticContext,
	type WishlistListOptimisticContextValue,
} from "../contexts/wishlist-list-optimistic-context";
import { SwipeableWishlistItem } from "./swipeable-wishlist-item";
import { WishlistEmptyState } from "./wishlist-empty-state";

interface WishlistListContentProps {
	items: GetWishlistReturn["items"];
}

/**
 * Contenu de la liste wishlist - Client Component
 *
 * Réutilise ProductCard pour uniformité visuelle avec le reste du site.
 * Les items sont directement des produits (le cookie `wishlist` est la SSOT,
 * plafonné à 100 ids — la grille rend tout, plus de pagination).
 *
 * Suppression directe : un retrait est appliqué optimistiquement via
 * `useOptimistic` (`onItemRemoved`) puis confirmé par la revalidation serveur.
 */
export function WishlistListContent({ items }: WishlistListContentProps) {
	const prefersReducedMotion = useReducedMotion();

	// Optimistic state pour la liste de produits (filtre par id)
	const [optimisticItems, removeOptimisticItem] = useOptimistic(
		items,
		(state, removedProductId: string) => state.filter((product) => product.id !== removedProductId),
	);

	const handleItemRemoved = (productId: string) => {
		removeOptimisticItem(productId);
	};

	const contextValue: WishlistListOptimisticContextValue = {
		onItemRemoved: handleItemRemoved,
	};

	const optimisticTotalCount = optimisticItems.length;

	const isEmpty = optimisticItems.length === 0;

	/*
	 * Annonce du passage à l'état vide via le canal global (`announce`), PAS via
	 * une région rendue dans `WishlistEmptyState`.
	 *
	 * ⚠️ Une région locale ne peut pas fonctionner ici : elle se monterait en même
	 * temps que l'état vide, donc au même frame que son texte — les lecteurs
	 * d'écran n'annoncent pas une région qui n'existait pas avant son contenu.
	 * `WishlistEmptyState` portait exactement ce défaut, et sa JSDoc en faisait
	 * pourtant sa raison d'être.
	 *
	 * `wasEmptyRef` restreint l'annonce à la **transition** : arriver sur une page
	 * de favoris déjà vide ne doit rien annoncer (le contenu de la page le dit).
	 */
	const wasEmptyRef = useRef(isEmpty);
	useEffect(() => {
		if (isEmpty && !wasEmptyRef.current) {
			announce("Ta liste de favoris est maintenant vide");
		}
		wasEmptyRef.current = isEmpty;
	}, [isEmpty]);

	// Empty state when all items have been optimistically removed
	if (isEmpty) {
		return (
			<WishlistListOptimisticContext value={contextValue}>
				<WishlistEmptyState />
			</WishlistListOptimisticContext>
		);
	}

	return (
		<WishlistListOptimisticContext value={contextValue}>
			<div className="space-y-8">
				{/* Header with count */}
				<p className="text-muted-foreground text-sm">
					{optimisticTotalCount} article{optimisticTotalCount > 1 ? "s" : ""}
				</p>

				{/* Grid des items de wishlist avec animation */}
				<div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
					<AnimatePresence mode="popLayout">
						{optimisticItems.map((product, index) => (
							<m.div
								key={product.id}
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
								<SwipeableWishlistItem
									productId={product.id}
									itemName={product.title}
									isFirst={index === 0}
								>
									<ProductCard
										product={product}
										index={index}
										isInWishlist
										sectionId="wishlist"
										disablePreload
									/>
								</SwipeableWishlistItem>
							</m.div>
						))}
					</AnimatePresence>
				</div>

				{/* Annonce pour screen readers */}
				<div role="status" aria-live="polite" className="sr-only">
					{optimisticTotalCount} article{optimisticTotalCount > 1 ? "s" : ""} dans tes favoris
				</div>
			</div>
		</WishlistListOptimisticContext>
	);
}
