"use client";

import { LoadMore } from "@/shared/components/load-more";

import { loadMoreProducts } from "../actions/load-more-products";
import type { Product, ProductFilters, SortField } from "../types/product.types";
import { ProductCard } from "./product-card";

interface ProductsLoadMoreProps {
	initialCursor: string | null;
	initialHasMore: boolean;
	initialDisplayedCount: number;
	totalCount: number;
	/** Pre-fetched wishlist ids passed from the page (avoids client refetch). */
	wishlistProductIds?: Set<string>;
	sortBy?: SortField;
	search?: string;
	filters?: ProductFilters;
	preferOnSale?: boolean;
}

/**
 * Mobile catalogue load-more.
 *
 * Hybrid pattern (Baymard-recommended for engaging mobile catalogues): button
 * remains visible for SR users + IntersectionObserver auto-loads at 80% viewport.
 * Footer stays accessible because hasMore eventually becomes false.
 *
 * Parent (`product-list.tsx`) re-mounts via key derived from filters/sort/search
 * to reset accumulated state when URL searchParams change. ⚠️ Ce remount est la
 * SEULE chose qui réinitialise `LoadMore` : son `useActionState` fige son état
 * initial, donc un `initialCursor` qui change ne suffit pas.
 *
 * `itemClassName="product-item"` : les cartes ajoutées reprennent l'animation
 * d'entrée de la grille du catalogue (SSOT `app/styles/animations.css`, avec son
 * repli `prefers-reduced-motion`), au lieu d'en jouer une seconde qui leur serait
 * propre. `--item-index` est posé par `LoadMore`, réinitialisé à chaque lot.
 */
export function ProductsLoadMore({
	initialCursor,
	initialHasMore,
	initialDisplayedCount,
	totalCount,
	wishlistProductIds,
	sortBy,
	search,
	filters,
	preferOnSale,
}: ProductsLoadMoreProps) {
	return (
		<LoadMore<Product>
			initialCursor={initialCursor}
			initialHasMore={initialHasMore}
			initialDisplayedCount={initialDisplayedCount}
			totalCount={totalCount}
			itemsLabel="produit"
			itemsLabelPlural="produits"
			buttonLabel="Voir plus de produits"
			errorMessage="Impossible de charger plus de produits"
			itemsContainerClassName="grid grid-cols-2 items-start gap-4 sm:gap-6"
			itemClassName="product-item"
			enableAutoLoad
			autoLoadThreshold={0.8}
			autoLoadRootMargin="0px 0px 200px 0px"
			getItemKey={(p) => p.id}
			renderItem={(p, i) => (
				<ProductCard
					product={p}
					index={initialDisplayedCount + i}
					isInWishlist={wishlistProductIds?.has(p.id)}
					sectionId="catalog"
					preferOnSale={preferOnSale}
					disablePreload
				/>
			)}
			loadFn={async (cursor) => {
				const result = await loadMoreProducts({
					cursor,
					sortBy,
					search,
					filters,
				});
				return {
					items: result.products,
					nextCursor: result.nextCursor,
					hasMore: result.hasMore,
					error: result.error,
				};
			}}
		/>
	);
}
