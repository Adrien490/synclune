import { Suspense, use, type CSSProperties } from "react";
import { WarningIcon } from "@phosphor-icons/react/ssr";

import { ProductCard } from "@/modules/products/components/product-card";
import { type GetProductsReturn } from "@/modules/products/data/get-products";
import type { ProductFilters, SortField } from "@/modules/products/types/product.types";
import { StorefrontPaginationBand } from "@/shared/components/cursor-pagination";
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
 * « L'étal continue », artifact du 2026-08-05. Même montage que `hero-grid.tsx`.
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
	 *
	 * C'est le `<div>` ci-dessous, partagé par les trois branches, qui porte cette
	 * stabilité : React y réutilise le même nœud DOM d'une branche à l'autre, donc
	 * la région n'est jamais recréée avec son texte. ⚠️ Il est en `display:
	 * contents`, **JAMAIS** une cellule de la grille.
	 *
	 * Il l'a été (`CATALOG_ROW_CELL`) — et comme la région est `sr-only`, donc
	 * `position: absolute`, hors flux, cette cellule mesurait 0 px de haut tout en
	 * consommant une RANGÉE ENTIÈRE de la grille du catalogue, juste sous le bloc
	 * titre qui en est la première cellule. Deux conséquences, aucune signalée :
	 *
	 * - à `lg`, le bloc titre (`lg:col-span-2` sur 3 colonnes) ne partageait plus
	 *   sa rangée avec une pièce — la rangée était fermée par la cellule vide, la
	 *   3ᵉ colonne restait blanche (~245 px) et les cartes tombaient toutes d'une
	 *   rangée ;
	 * - à tous les paliers, cette rangée fantôme coûtait une gouttière de plus
	 *   (16 / 24 / 32 px) que `ProductListSkeleton`, qui ne rend aucune cellule de
	 *   ce genre : le swap Suspense → contenu décalait la grille sur la seule page
	 *   dont le CLS est budgété en CI (`e2e/performance.spec.ts`).
	 *
	 * `contents` retire le nœud de la DISPOSITION sans le retirer du DOM : les
	 * deux invariants tiennent ensemble. Toute cellule VISIBLE se met donc à
	 * l'intérieur, et elle n'existe que si elle a du contenu
	 * (`catalog-live-region-not-a-cell.regression.test.tsx`).
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
			<div className="contents">
				{liveRegion}
				<div className={CATALOG_ROW_CELL}>
					<Alert variant="destructive">
						<WarningIcon className="size-4" />
						<AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center">
							<span>Je n&apos;arrive pas à charger les créations pour le moment.</span>
							<RefreshButton />
						</AlertDescription>
					</Alert>
				</div>
			</div>
		);
	}

	// Afficher les suggestions de repli si aucun produit (Baymard UX)
	if (products.length === 0) {
		return (
			<div className="contents">
				{liveRegion}
				<div className={CATALOG_ROW_CELL}>
					<Suspense fallback={<SearchFallbackSuggestionsSkeleton />}>
						<SearchFallbackSuggestions searchTerm={searchTerm} suggestion={suggestion} />
					</Suspense>
				</div>
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
			<div className="contents">
				{liveRegion}
				{/* Suggestion de correction si peu de resultats. Sa cellule n'existe que
				    quand elle a quelque chose à dire : une cellule inconditionnelle
				    fermait la rangée du bloc titre (cf. le commentaire ci-dessus). */}
				{suggestion && (
					<div className={CATALOG_ROW_CELL}>
						<SearchCorrectionSuggestion suggestion={suggestion} />
					</div>
				)}
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

			{/* Mobile : les cartes ajoutées et le carton d'étal sont des CELLULES de
			 * cette grille — pas un bloc posé dessous. `ProductsLoadMore` ne rend
			 * aucun conteneur et porte son gate `md:hidden` cellule par cellule :
			 * un wrapper coûterait un nœud DOM, donc la couture de 40 px qu'on
			 * vient précisément de supprimer. */}
			<ProductsLoadMore
				key={`${sortBy ?? "default"}-${searchTerm ?? ""}-${JSON.stringify(filters ?? {})}`}
				initialCursor={nextCursor}
				initialHasMore={hasNextPage}
				initialDisplayedCount={products.length}
				totalCount={totalCount}
				perPage={perPage}
				wishlistProductIds={wishlistProductIds}
				sortBy={sortBy}
				search={searchTerm}
				filters={filters}
				preferOnSale={preferOnSale}
			/>

			{/* Desktop : pagination URL-driven (deep-link, back/forward), rendue en
			 * bande « fin de l'étal » — le mobile continue au scroll via
			 * `ProductsLoadMore` ci-dessus. Plus de sélecteur « par page » côté
			 * boutique (audit cursor-pagination 2026-08-05, direction C). */}
			<div className={`${CATALOG_ROW_CELL} ${CATALOG_PENDING_DIM} mt-8 hidden md:block lg:mt-12`}>
				<StorefrontPaginationBand
					title="La suite de l'étal"
					noun={{ singular: "bijou", plural: "bijoux" }}
					hasNextPage={hasNextPage}
					hasPreviousPage={hasPreviousPage}
					currentPageSize={products.length}
					nextCursor={nextCursor}
					prevCursor={prevCursor}
					totalCount={totalCount}
				/>
			</div>
		</>
	);
}
