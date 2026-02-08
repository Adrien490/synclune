import { Suspense, use } from "react";
import { AlertTriangle } from "lucide-react";

import { ProductCard } from "@/modules/products/components/product-card";
import { GetProductsReturn } from "@/modules/products/data/get-products";
import { getWishlistProductIds } from "@/modules/wishlist/data/get-wishlist-product-ids";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";

import { SearchFallbackSuggestions, SearchFallbackSuggestionsSkeleton } from "./search-fallback-suggestions";
import { SearchCorrectionSuggestion } from "./search-correction-suggestion";

interface ProductListProps {
	productsPromise: Promise<GetProductsReturn>;
	perPage: number;
	/** Terme de recherche actuel */
	searchTerm?: string;
	/** URL de base pour reset (defaut: /produits) */
	baseResetUrl?: string;
}

export function ProductList({
	productsPromise,
	perPage,
	searchTerm,
	baseResetUrl = "/produits",
}: ProductListProps) {
	const result = use(productsPromise);
	const { products, pagination, totalCount, suggestion } = result;
	const error = "error" in result ? result.error : undefined;
	const wishlistProductIds = use(getWishlistProductIds());

	// Afficher une erreur si la requête a échoué
	if (error) {
		return (
			<Alert variant="destructive">
				<AlertTriangle className="h-4 w-4" />
				<AlertDescription>
					Une erreur est survenue lors du chargement des produits. Veuillez réessayer.
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
					baseResetUrl={baseResetUrl}
				/>
			</Suspense>
		);
	}

	const { nextCursor, prevCursor, hasNextPage, hasPreviousPage } = pagination;

	// Layout Grid par défaut
	return (
		<div className="space-y-6">
			{/* Suggestion de correction si peu de résultats */}
			{suggestion && (
				<SearchCorrectionSuggestion suggestion={suggestion} />
			)}

			{/* Compteur de résultats - annoncé aux lecteurs d'écran lors des changements */}
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

			{/* Grille des produits */}
			<div
				role="list"
				aria-label="Liste des produits"
				className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 outline-none group-has-[[data-pending]]/container:blur-[1px] group-has-[[data-pending]]/container:scale-[0.99] group-has-[[data-pending]]/container:pointer-events-none"
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
			</div>
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
