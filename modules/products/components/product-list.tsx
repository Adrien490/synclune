import { Suspense, use } from "react";
import { AlertTriangle } from "lucide-react";

import { ProductCard } from "@/modules/products/components/product-card";
import { GetProductsReturn } from "@/modules/products/data/get-products";
import { getWishlistProductIds } from "@/modules/wishlist/data/get-wishlist-product-ids";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { StaggerGrid } from "@/shared/components/animations/stagger-grid";
import { SITE_URL } from "@/shared/constants/seo-config";

import { SearchFallbackSuggestions, SearchFallbackSuggestionsSkeleton } from "./search-fallback-suggestions";
import { SearchCorrectionSuggestion } from "./search-correction-suggestion";

interface ProductListProps {
	productsPromise: Promise<GetProductsReturn>;
	perPage: number;
	/** Terme de recherche actuel */
	searchTerm?: string;
}

export function ProductList({
	productsPromise,
	perPage,
	searchTerm,
}: ProductListProps) {
	const result = use(productsPromise);
	const { products, pagination, totalCount, suggestion } = result;
	const error = "error" in result ? result.error : undefined;
	const wishlistProductIds = use(getWishlistProductIds());

	// Afficher une erreur si la requete a echoue
	if (error) {
		return (
			<Alert variant="destructive">
				<AlertTriangle className="h-4 w-4" />
				<AlertDescription>
					Une erreur est survenue lors du chargement des produits. Veuillez reessayer.
				</AlertDescription>
			</Alert>
		);
	}

	// Afficher les suggestions de repli si aucun produit (Baymard UX)
	if (!products || products.length === 0) {
		return (
			<Suspense fallback={<SearchFallbackSuggestionsSkeleton />}>
				<SearchFallbackSuggestions
					searchTerm={searchTerm}
					suggestion={suggestion}
				/>
			</Suspense>
		);
	}

	const { nextCursor, prevCursor, hasNextPage, hasPreviousPage } = pagination;

	// ItemList JSON-LD for rich snippets (carousel-style SERPs)
	const itemListJsonLd = {
		"@context": "https://schema.org",
		"@type": "ItemList",
		numberOfItems: totalCount,
		itemListElement: products.map((product, index) => ({
			"@type": "ListItem",
			position: index + 1,
			url: `${SITE_URL}/creations/${product.slug}`,
			name: product.title,
		})),
	};

	// Layout Grid par defaut
	return (
		<div className="space-y-6">
			{/* ItemList structured data for product grid */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(itemListJsonLd).replace(/</g, "\\u003c"),
				}}
			/>

			{/* Suggestion de correction si peu de resultats */}
			{suggestion && (
				<SearchCorrectionSuggestion suggestion={suggestion} />
			)}

			{/* Compteur de resultats - annonce aux lecteurs d'ecran lors des changements */}
			<div className="flex items-center justify-between">
				<p
					className="text-sm text-muted-foreground"
					aria-live="polite"
					aria-atomic="true"
				>
					<span className="font-medium text-foreground">{totalCount}</span>{" "}
					{totalCount > 1 ? "produits" : "produit"}
				</p>
			</div>

			{/* P8: Grille des produits avec animation stagger */}
			<StaggerGrid
				role="list"
				aria-label="Liste des produits"
				className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 outline-none group-has-[[data-pending]]/container:blur-[1px] group-has-[[data-pending]]/container:scale-[0.99] group-has-[[data-pending]]/container:pointer-events-none"
				inView={false}
			>
				{products.map((product, index) => (
					<div key={product.id} role="listitem" className="product-item">
						<ProductCard
							product={product}
							index={index}
							isInWishlist={wishlistProductIds.has(product.id)}
							sectionId="catalog"
						/>
					</div>
				))}
			</StaggerGrid>
			<div className="flex justify-end mt-8 lg:mt-12">
				<CursorPagination
					perPage={perPage}
					hasNextPage={hasNextPage}
					hasPreviousPage={hasPreviousPage}
					currentPageSize={products.length}
					nextCursor={nextCursor}
					prevCursor={prevCursor}
				/>
			</div>
		</div>
	);
}
