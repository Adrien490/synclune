"use client";

import { LoadMore } from "@/shared/components/load-more";

import { loadMoreProducts } from "../actions/load-more-products";
import type { Product, ProductFilters, SortField } from "../types/product.types";
import { CATALOG_PENDING_DIM } from "./catalog-grid.constants";
import { EtalCard } from "./etal-card";
import { ProductCard } from "./product-card";

interface ProductsLoadMoreProps {
	initialCursor: string | null;
	initialHasMore: boolean;
	initialDisplayedCount: number;
	totalCount: number;
	/** Taille de lot — reprise du `?perPage=` de l'URL, comme le rendu serveur. */
	perPage: number;
	/**
	 * Pre-fetched wishlist ids passed from the page (avoids client refetch).
	 * ⚠️ REQUIS, pas optionnel : un `undefined` silencieux rendrait `isInWishlist`
	 * faux partout — le cœur vide dont le clic RETIRE le favori (bug historique
	 * de l'étal, cf. hero-grid.tsx).
	 */
	wishlistProductIds: Set<string>;
	sortBy?: SortField;
	search?: string;
	filters?: ProductFilters;
}

/**
 * Mobile catalogue load-more.
 *
 * Hybrid pattern (Baymard-recommended for engaging mobile catalogues): the
 * affordance stays reachable for SR/keyboard users + IntersectionObserver
 * auto-loads at 80% viewport. Le pied de page redevient accessible parce que
 * `hasMore` finit par tomber à false.
 *
 * ## Ce composant ne rend AUCUN conteneur
 *
 * Ses cellules — les cartes ajoutées **et** le carton d'étal — sont des enfants
 * directs de la grille de `ProductCatalog`, comme celles de `ProductList`. C'est
 * ce qui a supprimé la couture de 40 px : tant qu'il rendait sa propre grille
 * dans une cellule `col-span-full` précédée d'un `mt-6`, la gouttière doublait
 * exactement à la frontière « rendu serveur / chargé par le navigateur ».
 *
 * ⚠️ Corollaire : le gate `md:hidden` ne vit plus sur un wrapper — il est posé
 * sur CHAQUE cellule. Un wrapper le porterait au prix d'un nœud DOM qui casse
 * le placement en grille.
 *
 * Parent (`product-list.tsx`) re-mounts via key derived from filters/sort/search
 * to reset accumulated state when URL searchParams change. ⚠️ Ce remount est la
 * SEULE chose qui réinitialise `LoadMore` : son `useActionState` fige son état
 * initial, donc un `initialCursor` qui change ne suffit pas.
 *
 * `itemClassName` : les cartes ajoutées reprennent l'animation d'entrée de la
 * grille du catalogue (SSOT `app/styles/animations.css`, avec son repli
 * `prefers-reduced-motion`), au lieu d'en jouer une seconde qui leur serait
 * propre. `--item-index` est posé par `LoadMore`, réinitialisé à chaque lot.
 */
export function ProductsLoadMore({
	initialCursor,
	initialHasMore,
	initialDisplayedCount,
	totalCount,
	perPage,
	wishlistProductIds,
	sortBy,
	search,
	filters,
}: ProductsLoadMoreProps) {
	return (
		<LoadMore<Product>
			initialCursor={initialCursor}
			initialHasMore={initialHasMore}
			initialDisplayedCount={initialDisplayedCount}
			totalCount={totalCount}
			// « pièce » — le mot de la page. Le `h1` dit « Les créations », le bloc
			// titre « N pièces en ligne » : « produit » était le seul mot que cette
			// page n'employait nulle part ailleurs.
			itemsLabel="pièce"
			itemsLabelPlural="pièces"
			// ⚠️ Féminin : sans ça la phrase annoncée disait « 1 nouveau pièce
			// chargé ». Une chaîne `sr-only` échappe à toute relecture visuelle.
			itemsGender="f"
			errorMessage="Je n'ai pas réussi à aller chercher la suite."
			itemClassName={`product-item ${CATALOG_PENDING_DIM} md:hidden`}
			enableAutoLoad
			autoLoadThreshold={0.8}
			autoLoadRootMargin="0px 0px 200px 0px"
			getItemKey={(p) => p.id}
			renderItem={(p, i) => (
				<ProductCard
					product={p}
					index={initialDisplayedCount + i}
					isInWishlist={wishlistProductIds.has(p.id)}
					sectionId="catalog"
					disablePreload
				/>
			)}
			renderAffordance={(state, handlers) => (
				<EtalCard {...state} {...handlers} className={`${CATALOG_PENDING_DIM} md:hidden`} />
			)}
			loadFn={async (cursor) => {
				const result = await loadMoreProducts({
					cursor,
					sortBy,
					search,
					filters,
					perPage,
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
