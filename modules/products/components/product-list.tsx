import { CursorPagination } from "@/shared/components/cursor-pagination";
import { Button } from "@/shared/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import { ProductCard } from "@/modules/products/components/product-card";
import { GetProductsReturn } from "@/modules/products/data/get-products";
import { getWishlistSkuIds } from "@/modules/wishlist/data/get-wishlist-sku-ids";
import { SearchX } from "lucide-react";
import { use } from "react";

interface ProductListProps {
	productsPromise: Promise<GetProductsReturn>;
	perPage: number;
}

export function ProductList({
	productsPromise,
	perPage,
}: ProductListProps) {
	const { products, pagination } = use(productsPromise);
	const wishlistSkuIds = use(getWishlistSkuIds());

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
				<EmptyContent>
					<Button asChild variant="primary">
						<a href="/produits">Voir tous les produits</a>
					</Button>
				</EmptyContent>
			</Empty>
		);
	}

	const { nextCursor, prevCursor, hasNextPage, hasPreviousPage } = pagination;

	// Layout Grid par défaut
	return (
		<div className="space-y-8">
			{/* Grille des produits - réaction au data-pending des filtres */}
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 transition-opacity duration-200 group-has-[[data-pending]]/container:opacity-50 group-has-[[data-pending]]/container:pointer-events-none">
				{products.map((product) => (
					<div key={product.id} className="product-item">
						<ProductCard
							product={product}
							wishlistSkuIds={wishlistSkuIds}
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
