import { Suspense, use } from "react";
import { TriangleAlert } from "lucide-react";

import { ProductCard } from "@/modules/products/components/product-card";
import { type GetProductsReturn } from "@/modules/products/data/get-products";
import type { ProductFilters, SortField } from "@/modules/products/types/product.types";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { PUBLIC_PER_PAGE_OPTIONS } from "@/shared/lib/pagination";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { StaggerGrid } from "@/shared/components/animations/stagger-grid";
import { RefreshButton } from "./refresh-button";
import { ProductsLoadMore } from "./products-load-more";

import {
	SearchFallbackSuggestions,
	SearchFallbackSuggestionsSkeleton,
} from "./search-fallback-suggestions";
import { ResultCountLiveRegion } from "@/shared/components/result-count-live-region";
import { SearchCorrectionSuggestion } from "./search-correction-suggestion";

interface ProductListProps {
	productsPromise: Promise<GetProductsReturn>;
	perPage: number;
	/** Terme de recherche actuel */
	searchTerm?: string;
	/** Wishlist product IDs (pre-fetched at page level to avoid inline promise) */
	wishlistProductIdsPromise?: Promise<Set<string>>;
	/** Si true, priorise l'affichage du SKU en promotion */
	preferOnSale?: boolean;
	/** Tri actif (forwardé à load-more mobile pour cohérence avec la page initiale). */
	sortBy?: SortField;
	/** Filtres serveur actifs (forwardés à load-more mobile). */
	filters?: ProductFilters;
}

export function ProductList({
	productsPromise,
	perPage,
	searchTerm,
	wishlistProductIdsPromise,
	preferOnSale,
	sortBy,
	filters,
}: ProductListProps) {
	const result = use(productsPromise);
	const { products, pagination, totalCount, suggestion } = result;
	const error = "error" in result ? result.error : undefined;
	const wishlistProductIds = wishlistProductIdsPromise
		? use(wishlistProductIdsPromise)
		: new Set<string>();

	/*
	 * La live region du nombre de résultats est rendue à une position STABLE, au
	 * dessus des trois branches (erreur / vide / peuplée). Auparavant le compteur
	 * `<p aria-live>` se trouvait *après* ces early-returns : passer de N à 0
	 * supprimait la région du DOM, et passer de 0 à N la recréait déjà remplie —
	 * or une région qui apparaît en même temps que son texte n'est pas annoncée.
	 * Les deux sens étaient donc muets. Audit recherche 2026-07-26.
	 *
	 * (Ce n'est PAS un problème de Suspense : l'URL est écrite dans un
	 * `startTransition`, et React ne réaffiche pas le fallback d'une frontière
	 * déjà révélée pendant une transition — c'est bien pour ça que
	 * `product-catalog.tsx` grise la grille existante au lieu du skeleton.)
	 */
	const liveRegion = (
		<ResultCountLiveRegion
			totalCount={totalCount}
			query={searchTerm}
			singular="produit"
			plural="produits"
		/>
	);

	// Afficher une erreur si la requete a echoue
	if (error) {
		return (
			<>
				{liveRegion}
				<Alert variant="destructive">
					<TriangleAlert className="size-4" />
					<AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<span>Une erreur est survenue lors du chargement des produits.</span>
						<RefreshButton />
					</AlertDescription>
				</Alert>
			</>
		);
	}

	// Afficher les suggestions de repli si aucun produit (Baymard UX)
	if (products.length === 0) {
		return (
			<>
				{liveRegion}
				<Suspense fallback={<SearchFallbackSuggestionsSkeleton />}>
					<SearchFallbackSuggestions searchTerm={searchTerm} suggestion={suggestion} />
				</Suspense>
			</>
		);
	}

	const { nextCursor, prevCursor, hasNextPage, hasPreviousPage } = pagination;

	// PAS d'`ItemList` JSON-LD ici — volontairement.
	//
	// Ce composant en émettait un (`numberOfItems: totalCount`) alors que les trois pages
	// qui le montent en émettent DÉJÀ un, imbriqué dans leur `CollectionPage` via
	// `mainEntity` : `buildCatalogJsonLd` pour /produits et /produits/[type],
	// `generateCollectionStructuredData` pour /collections/[slug]. Deux `ItemList` avec
	// des `numberOfItems` divergents (total réel vs 30 sérialisés) sur une même URL :
	// Google en retient un arbitrairement et le désaccord est un signal de qualité négatif.
	//
	// L'émetteur de page a été conservé parce que son `ItemList` reste *dans* son
	// `CollectionPage`, la forme attendue sur une page de catégorie. Corollaire assumé :
	// l'`aggregateRating` par produit disparaît du balisage (`buildItemListProduct` ne
	// reçoit pas `reviewStats`) ; le rétablir se fait là-bas, pas ici, et pas en
	// réintroduisant un second `ItemList`.

	// Layout Grid par defaut
	return (
		<div className="space-y-6">
			{liveRegion}

			{/* Suggestion de correction si peu de resultats */}
			{suggestion && <SearchCorrectionSuggestion suggestion={suggestion} />}

			{/* Compteur VISUEL uniquement — l'annonce est portée par
				`ResultCountLiveRegion` ci-dessus, à une position stable. Garder
				`aria-live` ici en ferait une seconde région concurrente de celle de
				`CursorPagination` (double annonce à chaque changement de page). */}
			<div className="flex items-center justify-between">
				<p className="text-muted-foreground text-sm">
					<span className="text-foreground font-medium">{totalCount}</span>{" "}
					{totalCount > 1 ? "produits" : "produit"}
				</p>
			</div>

			{/* P8: Grille des produits avec animation stagger.
			 *
			 * Plafonnée à 4 colonnes : PAS de palier `2xl:`. Le conteneur parent est
			 * capé à `max-w-6xl` (1152px, cf. product-catalog.tsx) et ne grandit pas
			 * au-delà — un palier de colonnes déclenché sur la largeur du VIEWPORT
			 * répartit donc le même espace en plus de parts. `2xl:grid-cols-5` faisait
			 * tomber les cartes de 248px à 192px (-22%) au lieu d'exploiter l'espace :
			 * la 5ᵉ colonne coûtait de la lisibilité produit sans rien gagner.
			 * Au-dessus de 1152px, l'espace est de la marge, pas des colonnes.
			 * Audit responsive 2026-07-26, P2. */}
			<StaggerGrid
				id="products-list"
				as="ul"
				itemAs="li"
				aria-label="Liste des produits"
				className="grid grid-cols-2 gap-4 transition-[opacity,filter,transform] duration-300 ease-out outline-none group-has-[[data-pending]]/container:pointer-events-none group-has-[[data-pending]]/container:scale-[0.98] group-has-[[data-pending]]/container:opacity-40 group-has-[[data-pending]]/container:blur-[2px] sm:gap-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-8"
				inView={false}
			>
				{products.map((product, index) => (
					<div
						key={product.id}
						className="product-item"
						style={{ "--item-index": index } as React.CSSProperties}
					>
						<ProductCard
							product={product}
							index={index}
							isInWishlist={wishlistProductIds.has(product.id)}
							sectionId="catalog"
							preferOnSale={preferOnSale}
						/>
					</div>
				))}
			</StaggerGrid>

			{/* Mobile: load-more hybride (bouton + IntersectionObserver 80%) */}
			<div className="mt-6 md:hidden">
				<ProductsLoadMore
					key={`${sortBy ?? "default"}-${searchTerm ?? ""}-${JSON.stringify(filters ?? {})}`}
					initialCursor={nextCursor}
					initialHasMore={hasNextPage}
					initialDisplayedCount={products.length}
					totalCount={totalCount}
					wishlistProductIds={wishlistProductIds}
					sortBy={sortBy}
					search={searchTerm}
					filters={filters}
					preferOnSale={preferOnSale}
				/>
			</div>

			{/* Desktop: cursor pagination URL-driven (deep-link, SEO, back/forward) */}
			<div className="mt-8 hidden justify-end md:flex lg:mt-12">
				<CursorPagination
					perPage={perPage}
					hasNextPage={hasNextPage}
					hasPreviousPage={hasPreviousPage}
					currentPageSize={products.length}
					nextCursor={nextCursor}
					prevCursor={prevCursor}
					totalCount={totalCount}
					perPageOptions={PUBLIC_PER_PAGE_OPTIONS}
				/>
			</div>
		</div>
	);
}
