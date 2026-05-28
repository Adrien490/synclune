import { Suspense, use } from "react";
import { TriangleAlert } from "lucide-react";

import { ProductCard } from "@/modules/products/components/product-card";
import { type GetProductsReturn } from "@/modules/products/data/get-products";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { StaggerGrid } from "@/shared/components/animations/stagger-grid";
import { RefreshButton } from "./refresh-button";
import { SITE_URL } from "@/shared/constants/seo-config";
import { safeJsonLd } from "@/shared/utils/safe-json-ld";

import {
	SearchFallbackSuggestions,
	SearchFallbackSuggestionsSkeleton,
} from "./search-fallback-suggestions";
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
}

export function ProductList({
	productsPromise,
	perPage,
	searchTerm,
	wishlistProductIdsPromise,
	preferOnSale,
}: ProductListProps) {
	const result = use(productsPromise);
	const { products, pagination, totalCount, suggestion } = result;
	const error = "error" in result ? result.error : undefined;
	const wishlistProductIds = wishlistProductIdsPromise
		? use(wishlistProductIdsPromise)
		: new Set<string>();

	// Afficher une erreur si la requete a echoue
	if (error) {
		return (
			<Alert variant="destructive">
				<TriangleAlert className="size-4" />
				<AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center">
					<span>Une erreur est survenue lors du chargement des produits.</span>
					<RefreshButton />
				</AlertDescription>
			</Alert>
		);
	}

	// Afficher les suggestions de repli si aucun produit (Baymard UX)
	if (products.length === 0) {
		return (
			<Suspense fallback={<SearchFallbackSuggestionsSkeleton />}>
				<SearchFallbackSuggestions searchTerm={searchTerm} suggestion={suggestion} />
			</Suspense>
		);
	}

	const { nextCursor, prevCursor, hasNextPage, hasPreviousPage } = pagination;

	// ItemList JSON-LD for rich snippets (Google Shopping carousel-style SERPs).
	// Each item embeds a full Product with Offer (price EUR, availability) and
	// aggregateRating when reviews exist — mirrors home page pattern in
	// `shared/components/structured-data.tsx` for consistency.
	const itemListJsonLd = {
		"@context": "https://schema.org",
		"@type": "ItemList",
		numberOfItems: totalCount,
		itemListElement: products.map((product, index) => {
			const url = `${SITE_URL}/creations/${product.slug}`;
			// skus are pre-sorted by [isDefault desc, priceInclTax asc] in GET_PRODUCTS_SELECT
			const defaultSku = product.skus[0];
			const primaryImage = defaultSku?.images.find((img) => img.isPrimary) ?? defaultSku?.images[0];
			const priceCents = defaultSku?.priceInclTax;
			const inStock = (defaultSku?.inventory ?? 0) > 0;

			const productNode: Record<string, unknown> = {
				"@type": "Product",
				"@id": `${url}#product`,
				name: product.title,
				url,
				...(product.description && { description: product.description }),
				...(primaryImage && { image: primaryImage.url }),
				...(product.reviewStats &&
					product.reviewStats.totalCount > 0 && {
						aggregateRating: {
							"@type": "AggregateRating",
							ratingValue: Number(product.reviewStats.averageRating).toFixed(1),
							reviewCount: product.reviewStats.totalCount,
							bestRating: 5,
							worstRating: 1,
						},
					}),
				...(typeof priceCents === "number" && {
					offers: {
						"@type": "Offer",
						url,
						price: (priceCents / 100).toFixed(2),
						priceCurrency: "EUR",
						availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
						itemCondition: "https://schema.org/NewCondition",
					},
				}),
			};

			return {
				"@type": "ListItem",
				position: index + 1,
				url,
				item: productNode,
			};
		}),
	};

	// Layout Grid par defaut
	return (
		<div className="space-y-6">
			{/* ItemList structured data — SAFE: serialized via safeJsonLd (no user HTML) */}
			{/* react-doctor-disable-next-line react/no-danger */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: safeJsonLd(itemListJsonLd),
				}}
			/>

			{/* Suggestion de correction si peu de resultats */}
			{suggestion && <SearchCorrectionSuggestion suggestion={suggestion} />}

			{/* Compteur de resultats - annonce aux lecteurs d'ecran lors des changements */}
			<div className="flex items-center justify-between">
				<p className="text-muted-foreground text-sm" aria-live="polite" aria-atomic="true">
					<span className="text-foreground font-medium">{totalCount}</span>{" "}
					{totalCount > 1 ? "produits" : "produit"}
				</p>
			</div>

			{/* P8: Grille des produits avec animation stagger */}
			<StaggerGrid
				role="list"
				aria-label="Liste des produits"
				className="grid grid-cols-2 gap-4 transition-[opacity,filter,transform] duration-300 ease-out outline-none group-has-[[data-pending]]/container:pointer-events-none group-has-[[data-pending]]/container:scale-[0.98] group-has-[[data-pending]]/container:opacity-40 group-has-[[data-pending]]/container:blur-[2px] sm:gap-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-8 2xl:grid-cols-5"
				inView={false}
			>
				{products.map((product, index) => (
					<div
						key={product.id}
						role="listitem"
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
			<div className="mt-8 flex justify-end lg:mt-12">
				<CursorPagination
					perPage={perPage}
					hasNextPage={hasNextPage}
					hasPreviousPage={hasPreviousPage}
					currentPageSize={products.length}
					nextCursor={nextCursor}
					prevCursor={prevCursor}
					totalCount={totalCount}
				/>
			</div>
		</div>
	);
}
