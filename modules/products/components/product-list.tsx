import { ProductCard } from "@/modules/products/components/product-card";
import { GetProductsReturn } from "@/modules/products/data/get-products";
import { getWishlistProductIds } from "@/modules/wishlist/data/get-wishlist-product-ids";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { Button } from "@/shared/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import { SearchX } from "lucide-react";
import Link from "next/link";
import { use } from "react";

import { SpellSuggestion } from "./spell-suggestion";

interface ProductListProps {
	productsPromise: Promise<GetProductsReturn>;
	perPage: number;
}

export function ProductList({
	productsPromise,
	perPage,
}: ProductListProps) {
	const { products, pagination, totalCount, suggestion } = use(productsPromise);
	const wishlistProductIds = use(getWishlistProductIds());

	// Afficher le composant Empty si aucun produit
	if (!products || products.length === 0) {
		return (
			<Empty className="mt-4 mb-12 sm:my-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<SearchX className="size-6" />
					</EmptyMedia>
					<EmptyTitle>Aucun produit trouvé</EmptyTitle>
				</EmptyHeader>
				<EmptyContent className="space-y-3">
					{suggestion ? (
						<SpellSuggestion suggestion={suggestion} />
					) : (
						<p className="text-sm text-muted-foreground">
							Essaie d'ajuster tes filtres pour voir plus de créations.
						</p>
					)}
					<Button asChild variant="primary">
						<Link href="/produits">Effacer les filtres</Link>
					</Button>
				</EmptyContent>
			</Empty>
		);
	}

	const { nextCursor, prevCursor, hasNextPage, hasPreviousPage } = pagination;

	// Layout Grid par défaut
	return (
		<div className="space-y-6">
			{/* Suggestion de correction si peu de résultats */}
			{suggestion && (
				<SpellSuggestion suggestion={suggestion} />
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

			{/* Grille des produits - réaction au data-pending des filtres */}
			<div
				tabIndex={-1}
				className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 outline-none motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none group-has-[[data-pending]]/container:blur-[1px] group-has-[[data-pending]]/container:scale-[0.99] group-has-[[data-pending]]/container:pointer-events-none"
			>
				{products.map((product, index) => (
					<div key={product.id} className="product-item">
						<ProductCard
							product={product}
							index={index}
							isInWishlist={wishlistProductIds.has(product.id)}
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
