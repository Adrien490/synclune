import { Suspense, use, type CSSProperties } from "react";
import { WarningIcon } from "@phosphor-icons/react/ssr";

import { ProductCard } from "@/modules/products/components/product-card";
import { type GetProductsReturn } from "@/modules/products/data/get-products";
import type { ProductFilters, SortField } from "@/modules/products/types/product.types";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { PUBLIC_PER_PAGE_OPTIONS } from "@/shared/lib/pagination";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { RefreshButton } from "./refresh-button";
import { ProductsLoadMore } from "./products-load-more";
import { CATALOG_PENDING_DIM, CATALOG_ROW_CELL } from "./catalog-grid.constants";

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

/**
 * Cellules « créations » du catalogue — rendues DANS la grille du shell.
 *
 * @description
 * Ce composant **ne rend aucun conteneur** : ses cellules sont des enfants
 * directs de la grille de `ProductCatalog` (un fragment et une frontière
 * `Suspense` ne produisent pas de nœud DOM, donc ne cassent pas le placement en
 * grille). C'est ce qui permet au bloc titre d'être la première CELLULE de la
 * grille des créations plutôt qu'une bande posée au-dessus — direction
 * « L'étal continue », artifact du 2026-08-05. Même montage que `etal-grid.tsx`.
 *
 * ⚠️ **Plus de `<ul>` / `<li>`.** La grille mélange désormais un bloc titre et
 * des cartes ; en faire une liste demanderait soit un `display: contents` sur le
 * `<ul>` (qui fait tomber la sémantique de liste sur plusieurs moteurs), soit
 * d'annoncer le `<h1>` comme « élément 1 sur N ». Chaque `ProductCard` est déjà
 * un `<article aria-labelledby>` annoncé individuellement, et le `h2` masqué du
 * bloc titre nomme l'ensemble. Arbitrage identique à celui de l'étal.
 *
 * ⚠️ **Le grisage `data-pending` est posé CELLULE par cellule**, pas sur la
 * grille : posé sur le conteneur, il éteindrait aussi le bloc titre et son
 * compteur pendant une recherche — or c'est précisément le compteur qu'on veut
 * voir changer.
 */
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
	 * `product-catalog.tsx` grise les cartes existantes au lieu du skeleton.)
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
			<div className={CATALOG_ROW_CELL}>
				{liveRegion}
				<Alert variant="destructive">
					<WarningIcon className="size-4" />
					<AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<span>Je n&apos;arrive pas à charger les créations pour le moment.</span>
						<RefreshButton />
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	// Afficher les suggestions de repli si aucun produit (Baymard UX)
	if (products.length === 0) {
		return (
			<div className={CATALOG_ROW_CELL}>
				{liveRegion}
				<Suspense fallback={<SearchFallbackSuggestionsSkeleton />}>
					<SearchFallbackSuggestions searchTerm={searchTerm} suggestion={suggestion} />
				</Suspense>
			</div>
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
	// `CollectionPage`, la forme attendue sur une page de catégorie.

	return (
		<>
			<div className={CATALOG_ROW_CELL}>
				{liveRegion}
				{/* Suggestion de correction si peu de resultats */}
				{suggestion && <SearchCorrectionSuggestion suggestion={suggestion} />}
			</div>

			{/* Le compteur VISUEL a rejoint le bloc titre (`catalog-heading.tsx`) : il
			    y est une phrase, plus un gris de 14 px coincé entre les filtres et la
			    grille. L'annonce, elle, reste portée par `ResultCountLiveRegion`
			    ci-dessus, à une position stable. */}

			{/* Les cartes sont des cellules de la grille du shell — plafonnée à 4
			 * colonnes, PAS de palier `2xl:` : le conteneur est capé à `max-w-6xl`
			 * (1152px) et ne grandit pas au-delà, donc une colonne de plus répartit le
			 * même espace en plus de parts. `2xl:grid-cols-5` faisait tomber les cartes
			 * de 248px à 192px (-22%). Audit responsive 2026-07-26, P2. */}
			{products.map((product, index) => (
				<div
					key={product.id}
					className={`product-item ${CATALOG_PENDING_DIM}`}
					style={{ "--item-index": index } as CSSProperties}
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

			<div className={`${CATALOG_ROW_CELL} ${CATALOG_PENDING_DIM}`}>
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
		</>
	);
}
